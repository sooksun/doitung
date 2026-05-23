// scripts/migrate-thai-split-section.js
// One-off, idempotent migration: split the Thai ป.1–3 section
//   "การจัดกระบวนการเรียนรู้และการวัดประเมินผล" (Learning Process & Assessment)
// into TWO sections:
//   4. "การจัดกระบวนการเรียนรู้" (Learning Process)  — keeps itemCode 4.1.x
//   5. "การวัดประเมินผล"        (Assessment)         — itemCode 4.2.x
// Responses are keyed by indicatorId, so moving an indicator's sectionId does NOT lose data.
//
// Run MANUALLY, after a DB backup:  node scripts/migrate-thai-split-section.js
// Idempotent: safe to re-run. NOT wired into docker-entrypoint.sh.

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const instrument = await prisma.instrument.findUnique({ where: { code: 'THAI_P1_3' } });
  if (!instrument) {
    console.log('No THAI_P1_3 instrument found — nothing to migrate.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Section that currently holds the 4.x indicators (old combined name, or already-renamed)
    let processSection = await tx.instrumentSection.findFirst({
      where: {
        instrumentId: instrument.id,
        OR: [{ nameEn: 'Learning Process' }, { nameEn: 'Learning Process & Assessment' }],
      },
    });
    if (!processSection) {
      console.log('Process section not found — nothing to migrate.');
      return;
    }

    if (processSection.nameEn !== 'Learning Process' || processSection.nameTh !== 'การจัดกระบวนการเรียนรู้') {
      processSection = await tx.instrumentSection.update({
        where: { id: processSection.id },
        data: { nameEn: 'Learning Process', nameTh: 'การจัดกระบวนการเรียนรู้' },
      });
      console.log('Renamed section 4 → "การจัดกระบวนการเรียนรู้" (Learning Process)');
    }

    let assessSection = await tx.instrumentSection.findFirst({
      where: { instrumentId: instrument.id, nameEn: 'Assessment' },
    });
    if (!assessSection) {
      assessSection = await tx.instrumentSection.create({
        data: {
          instrumentId: instrument.id,
          nameTh: 'การวัดประเมินผล',
          nameEn: 'Assessment',
          order: (processSection.order || 4) + 1,
        },
      });
      console.log(`Created section 5 → "การวัดประเมินผล" (Assessment), order ${assessSection.order}`);
    }

    const toMove = await tx.indicator.findMany({
      where: { instrumentId: instrument.id, itemCode: { startsWith: '4.2' } },
      select: { id: true, sectionId: true, itemCode: true },
    });
    let moved = 0;
    for (const ind of toMove) {
      if (ind.sectionId !== assessSection.id) {
        await tx.indicator.update({ where: { id: ind.id }, data: { sectionId: assessSection.id } });
        moved++;
      }
    }
    console.log(`Moved ${moved} of ${toMove.length} indicator(s) (4.2.x) → "การวัดประเมินผล".`);
  });

  console.log('Done.');
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
