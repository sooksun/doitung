// scripts/analyze-year-rename.ts — read-only impact analysis for renaming
// AcademicYear "2568" → "2569" and Term "1/2568" → "1/2569".
// Lists every table whose rows would be touched.

import { prisma } from '../lib/prisma';

async function main() {
  console.log('=== AcademicYear records ===');
  const years = await prisma.academicYear.findMany({
    select: { id: true, year: true, _count: { select: { terms: true, sessions: true, objectives: true, sarDocuments: true, actionRatings: true } } },
    orderBy: { year: 'asc' },
  });
  for (const y of years) {
    console.log(`  #${y.id}  year="${y.year}"  terms=${y._count.terms}  sessions=${y._count.sessions}  okrObjectives=${y._count.objectives}  sarDocs=${y._count.sarDocuments}  okrActionRatings=${y._count.actionRatings}`);
  }

  const ay = years.find((y) => y.year === '2568');
  if (!ay) {
    console.log('\nNo AcademicYear "2568" found — nothing to rename.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n=== Terms under AcademicYear #${ay.id} (year=2568) ===`);
  const terms = await prisma.term.findMany({
    where: { academicYearId: ay.id },
    select: { id: true, name: true, startDate: true, endDate: true, _count: { select: { sessions: true, actionRatings: true } } },
    orderBy: { id: 'asc' },
  });
  for (const t of terms) {
    console.log(`  #${t.id}  name="${t.name}"  startDate=${t.startDate?.toISOString().slice(0,10) ?? '-'}  endDate=${t.endDate?.toISOString().slice(0,10) ?? '-'}  sessions=${t._count.sessions}  okrActionRatings=${t._count.actionRatings}`);
  }

  console.log('\n=== Tables that reference AcademicYear OR Term ===');
  console.log('(FK columns, counts for year 2568 / term 1/2568)\n');

  const term1 = terms.find((t) => t.name === '1/2568');

  // EvaluationSession
  const sessionsYear = await prisma.evaluationSession.count({ where: { academicYearId: ay.id } });
  const sessionsTerm = term1 ? await prisma.evaluationSession.count({ where: { termId: term1.id } }) : 0;
  console.log(`EvaluationSession.academicYearId  : ${sessionsYear} rows`);
  console.log(`EvaluationSession.termId          : ${sessionsTerm} rows`);

  // OKR (module removed but data may remain)
  const objYear = await prisma.oKRObjective.count({ where: { academicYearId: ay.id } });
  const ratingsYear = await prisma.oKRActionRating.count({ where: { academicYearId: ay.id } });
  const ratingsTerm = term1 ? await prisma.oKRActionRating.count({ where: { termId: term1.id } }) : 0;
  console.log(`OKRObjective.academicYearId       : ${objYear} rows  (orphan module)`);
  console.log(`OKRActionRating.academicYearId    : ${ratingsYear} rows  (orphan module)`);
  console.log(`OKRActionRating.termId            : ${ratingsTerm} rows  (orphan module)`);

  // SAR
  const sarYear = await prisma.sarDocument.count({ where: { academicYearId: ay.id } });
  console.log(`SarDocument.academicYearId        : ${sarYear} rows`);

  console.log('\n=== Total impact if year string changes 2568 → 2569 ===');
  const totalRowsAffectingDisplay = sessionsYear + sessionsTerm + objYear + ratingsYear + ratingsTerm + sarYear;
  console.log(`Display-affected rows (FK still works, only the human label changes): ${totalRowsAffectingDisplay}`);
  console.log('All rows above keep their FK reference intact — schema integrity stays valid.');
  console.log('What changes is only the display string ("2568" → "2569") shown in UI / labels.');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
