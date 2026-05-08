// scripts/migrate-q-model-instrument.js
//
// One-shot migration that converges the Q-Model instrument set in the database
// onto the canonical layout described in the PDF:
//   - exactly ONE Q-Model instrument with code = 'Q-MODEL-2568'
//   - 4 sections (Q-Leadership, Q-PLC, Q-Learning, Q-Students)
//   - 47 indicators with itemCodes L1..L12, PLC1..PLC10, T1..T12, S1..S13
//   - each indicator carrying its 5-level rubric in `levelDescriptors`
//
// History this fixes
// ─────────────────
// Older deployments seeded Q-Model with the legacy 6-dimension layout
// (Q-Leadership, Q-PLC, Q-Learning, Q-Goal, Q-Info, Q-Network) plus duplicate
// rows. The May 2026 cleanup removed Q-Goal/Q-Info/Q-Network from the SPEC
// but never wiped the data, so a fresh DB has:
//   - Instrument id=3, code='Q_MODEL': 6 sections (some duplicated) and ~72
//     indicator rows with itemCodes Q-L-01, Q-PLC-01, Q-G-01, Q-I-01, Q-N-01,
//     Q-LE-01 … none of which match the new L1/PLC1/T1/S1 schema.
//   - Instrument id=4, code='Q-MODEL-2568': clean 47-indicator set added by
//     scripts/seed-production.js but never used (0 sessions).
// Real evaluation sessions were created against id=3, but the data on those
// sessions is sparse smoke-test responses (Q-L-01 / Q-L-02 only).
//
// What this script does
// ─────────────────────
// 1. Idempotent guard: if the Q-Model instrument set is already in the
//    canonical shape (single row, code='Q-MODEL-2568', no legacy itemCodes),
//    the script logs and exits.
// 2. Drops the orphan duplicate (id=4 in the example above) — its sessions
//    and responses count is zero, so this is safe.
// 3. Renames the legacy instrument's code to 'Q-MODEL-2568' so the rest of
//    the codebase (seed-production.js) targets it via upsert by code.
// 4. Wipes the legacy sections + indicators + the smoke-test responses that
//    referenced them. Real EvaluationSession rows are KEPT — they re-render
//    against the new 47-indicator set on next load.
// 5. Leaves it to scripts/seed-production.js to recreate the 4 canonical
//    sections + 47 indicators with `levelDescriptors` populated from
//    scripts/data/q-model-rubrics.js.

const { PrismaClient } = require('@prisma/client');

// itemCodes that belong to the canonical 47-indicator set. Anything else on
// a Q-Model instrument is legacy and gets pruned.
const CANONICAL_PREFIXES = ['L', 'PLC', 'T', 'S'];
function isCanonicalCode(code) {
  if (!code) return false;
  // L1..L12, PLC1..PLC10, T1..T12, S1..S13
  return /^(L|PLC|T|S)\d+$/.test(code);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const instruments = await prisma.instrument.findMany({
      where: { type: 'Q_MODEL' },
      orderBy: { id: 'asc' },
    });
    if (instruments.length === 0) {
      console.log('  Q-Model migration: no Q_MODEL instrument yet — nothing to do.');
      return;
    }

    // Idempotent fast-path: if there's exactly one Q-Model instrument and it
    // already has the right code + only canonical itemCodes + 47 indicators,
    // we're done.
    if (instruments.length === 1 && instruments[0].code === 'Q-MODEL-2568') {
      const indicatorRows = await prisma.indicator.findMany({
        where: { instrumentId: instruments[0].id },
        select: { itemCode: true },
      });
      const allCanonical = indicatorRows.every((r) => isCanonicalCode(r.itemCode));
      if (allCanonical && indicatorRows.length === 47) {
        console.log('  Q-Model migration: already canonical (1 instrument, 47 indicators, rubric ready) — skipping.');
        return;
      }
    }

    // Pick the canonical row: prefer the one with EvaluationSessions, then by
    // earliest id. The other Q-Model instruments are duplicates and can go.
    const sessionCounts = await prisma.evaluationSession.groupBy({
      by: ['instrumentId'],
      _count: { _all: true },
      where: { instrumentId: { in: instruments.map((i) => i.id) } },
    });
    const sessionCountById = new Map(sessionCounts.map((r) => [r.instrumentId, r._count._all]));
    const canonicalId = instruments
      .slice()
      .sort((a, b) => {
        const aSessions = sessionCountById.get(a.id) || 0;
        const bSessions = sessionCountById.get(b.id) || 0;
        if (aSessions !== bSessions) return bSessions - aSessions; // more sessions wins
        return a.id - b.id;
      })[0].id;

    console.log(`  Q-Model migration: chose instrument id=${canonicalId} as canonical (most sessions, smallest id wins ties).`);

    // Everything below is a destructive sequence of writes. Wrap in a single
    // interactive transaction so a partial failure (DB hang, container kill)
    // rolls back instead of leaving the schema half-migrated.
    const CANONICAL_SECTION_NAMES = new Set(['Q-Leadership', 'Q-PLC', 'Q-Learning', 'Q-Students']);
    await prisma.$transaction(
      async (tx) => {
        // 1) Drop other Q-Model instruments — but only if they have zero sessions.
        //    Anything with sessions stays; we already chose the busiest as canonical.
        for (const inst of instruments) {
          if (inst.id === canonicalId) continue;
          const sessions = sessionCountById.get(inst.id) || 0;
          if (sessions > 0) {
            console.log(`    SKIP: instrument id=${inst.id} (code=${inst.code}) has ${sessions} session(s); leaving it alone.`);
            continue;
          }
          const indicatorIds = (await tx.indicator.findMany({
            where: { instrumentId: inst.id },
            select: { id: true },
          })).map((r) => r.id);
          if (indicatorIds.length > 0) {
            await tx.evaluationResponse.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
            await tx.oKRKeyResultIndicator.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
            await tx.sarEvidenceLink.deleteMany({ where: { indicatorId: { in: indicatorIds } } });
            await tx.indicator.deleteMany({ where: { id: { in: indicatorIds } } });
          }
          await tx.instrumentSection.deleteMany({ where: { instrumentId: inst.id } });
          await tx.instrument.delete({ where: { id: inst.id } });
          console.log(`    Dropped duplicate instrument id=${inst.id} (code=${inst.code}).`);
        }

        // 2) Rename the canonical instrument's code so seed-production.js's
        //    upsert-by-code lands on this row.
        const canonical = await tx.instrument.findUnique({ where: { id: canonicalId } });
        if (canonical && canonical.code !== 'Q-MODEL-2568') {
          const collision = await tx.instrument.findUnique({ where: { code: 'Q-MODEL-2568' } });
          if (collision && collision.id !== canonicalId) {
            // The whole transaction will roll back from this throw, leaving
            // the original layout intact.
            throw new Error(`Cannot rename canonical instrument: code 'Q-MODEL-2568' is taken by id=${collision.id}.`);
          }
          await tx.instrument.update({
            where: { id: canonicalId },
            data: {
              code: 'Q-MODEL-2568',
              nameTh: 'แบบประเมิน Q-Model ปี 2568',
              nameEn: 'Q-Model Assessment 2568',
              version: '1.0',
              isActive: true,
            },
          });
          console.log(`    Renamed instrument id=${canonicalId} code → 'Q-MODEL-2568'.`);
        }

        // 3) Wipe legacy sections + indicators on the canonical row. Anything
        //    whose itemCode isn't L#/PLC#/T#/S# is legacy. We also drop
        //    duplicates within the canonical set so the post-condition is
        //    "exactly 47 indicators across 4 sections".
        const allIndicators = await tx.indicator.findMany({
          where: { instrumentId: canonicalId },
          select: { id: true, itemCode: true },
        });

        const legacyIds = allIndicators
          .filter((r) => !isCanonicalCode(r.itemCode))
          .map((r) => r.id);

        const seen = new Set();
        const dupIds = [];
        for (const r of allIndicators.filter((r) => isCanonicalCode(r.itemCode))) {
          if (seen.has(r.itemCode)) dupIds.push(r.id);
          else seen.add(r.itemCode);
        }

        const toDrop = [...legacyIds, ...dupIds];
        if (toDrop.length > 0) {
          const responseCount = await tx.evaluationResponse.count({
            where: { indicatorId: { in: toDrop } },
          });
          if (responseCount > 0) {
            console.log(`    Wiping ${responseCount} EvaluationResponse row(s) on legacy/duplicate indicators.`);
            await tx.evaluationResponse.deleteMany({ where: { indicatorId: { in: toDrop } } });
          }
          await tx.oKRKeyResultIndicator.deleteMany({ where: { indicatorId: { in: toDrop } } });
          await tx.sarEvidenceLink.deleteMany({ where: { indicatorId: { in: toDrop } } });
          await tx.indicator.deleteMany({ where: { id: { in: toDrop } } });
          console.log(`    Dropped ${legacyIds.length} legacy + ${dupIds.length} duplicate indicator(s) from instrument id=${canonicalId}.`);
        }

        // 4) Drop sections that aren't in the canonical 4. Also dedupe canonical
        //    sections so each appears exactly once.
        const allSections = await tx.instrumentSection.findMany({
          where: { instrumentId: canonicalId },
          orderBy: { id: 'asc' },
          select: { id: true, nameEn: true },
        });
        const sectionDropIds = [];
        const seenSections = new Set();
        for (const s of allSections) {
          if (!CANONICAL_SECTION_NAMES.has(s.nameEn)) {
            sectionDropIds.push(s.id);
            continue;
          }
          if (seenSections.has(s.nameEn)) sectionDropIds.push(s.id);
          else seenSections.add(s.nameEn);
        }
        if (sectionDropIds.length > 0) {
          await tx.indicator.updateMany({
            where: { sectionId: { in: sectionDropIds } },
            data: { sectionId: null },
          });
          await tx.instrumentSection.deleteMany({ where: { id: { in: sectionDropIds } } });
          console.log(`    Dropped ${sectionDropIds.length} legacy/duplicate section(s) from instrument id=${canonicalId}.`);
        }
      },
      // Bump the interactive-transaction timeout above the default 5s — a
      // first run on a polluted DB does cascading deletes across multiple
      // tables (response → indicator → section → instrument) and can take
      // several seconds. Idempotent re-runs return in milliseconds.
      { maxWait: 10_000, timeout: 30_000 },
    );

    console.log('  Q-Model migration: done. seed-production.js will now create the 4 canonical sections + 47 indicators with rubric on this row.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('  Q-Model migration failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
