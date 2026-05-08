// scripts/dedupe-sticky-boards.js
//
// Migration helper. Collapses any duplicate StickyBoard rows for the same
// (contextType, contextId) into a single canonical board, MOVING all sticky
// notes to that canonical board first, then deleting the leftover board rows.
//
// We have to run this BEFORE `prisma db push` introduces the new
//   @@unique([contextType, contextId])
// constraint on StickyBoard, otherwise the schema push would fail on any
// duplicates left over from the previous (non-unique) implementation.
//
// Selection rule for the canonical board, in order:
//   1. status = 'ACTIVE'           (a live board wins over an archived one)
//   2. most ACTIVE notes            (preserve where the brainstorming actually lives)
//   3. most recent updatedAt        (final tiebreaker)
//
// Properties:
//   - Idempotent: when there are no duplicates the script exits in a few ms.
//   - NEVER deletes StickyNote rows. Notes are moved by re-pointing boardId.
//   - Never invents new StickyBoard rows.

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Surface only contexts that actually have duplicates. We use raw SQL so
    // the COUNT comparison happens server-side and we don't pull every board
    // into memory.
    const dupGroups = await prisma.$queryRaw`
      SELECT contextType, contextId
      FROM StickyBoard
      GROUP BY contextType, contextId
      HAVING COUNT(*) > 1
    `;

    if (!Array.isArray(dupGroups) || dupGroups.length === 0) {
      console.log('  StickyBoard dedupe: no duplicates found.');
      return;
    }

    console.log(`  StickyBoard dedupe: ${dupGroups.length} context group(s) have duplicates — merging…`);

    let mergedBoards = 0;
    let movedNotes = 0;

    for (const g of dupGroups) {
      const boards = await prisma.stickyBoard.findMany({
        where: { contextType: g.contextType, contextId: g.contextId },
      });

      // Annotate each board with its current ACTIVE-note count.
      const annotated = await Promise.all(
        boards.map(async (b) => ({
          ...b,
          noteCount: await prisma.stickyNote.count({
            where: { boardId: b.id, status: 'ACTIVE' },
          }),
        })),
      );

      // Apply the selection rule. Sort descending so index 0 is canonical.
      annotated.sort((a, b) => {
        const aActive = a.status === 'ACTIVE' ? 1 : 0;
        const bActive = b.status === 'ACTIVE' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        if (a.noteCount !== b.noteCount) return b.noteCount - a.noteCount;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      const canonical = annotated[0];
      const duplicates = annotated.slice(1);
      console.log(
        `    ${g.contextType}/${g.contextId}: keep ${canonical.id.slice(0, 8)} (${canonical.noteCount} notes, ${canonical.status}); merging ${duplicates.length} duplicate(s)`,
      );

      for (const dup of duplicates) {
        // Move EVERY note (incl. ARCHIVED ones — preserve full history) onto
        // the canonical board. Then drop the now-empty duplicate row.
        const moved = await prisma.stickyNote.updateMany({
          where: { boardId: dup.id },
          data: { boardId: canonical.id },
        });
        movedNotes += moved.count;
        await prisma.stickyBoard.delete({ where: { id: dup.id } });
        mergedBoards += 1;
      }
    }

    console.log(
      `  StickyBoard dedupe: merged ${mergedBoards} duplicate board row(s), moved ${movedNotes} note(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('  StickyBoard dedupe failed:', err && err.stack ? err.stack : err);
  // Exit non-zero so the entrypoint can decide whether to keep going. The
  // entrypoint currently keeps going on schema-related warnings; if dedupe
  // fails but a duplicate still exists, `prisma db push` will fail next and
  // surface the issue clearly in the logs.
  process.exit(1);
});
