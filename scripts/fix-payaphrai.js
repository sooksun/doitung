// scripts/fix-payaphrai.js
// Repair the 23 teachers from "โรงเรียนบ้านพญาไพร" that the DE seeder
// accidentally placed on School #1 (โรงเรียนดอยตุง, code SCH-001) because
// the dev/prod School.id mapping diverged.
//
// Move each affected User+Teacher:
//   schoolId:        1 (Doitung)          ->  98 (บ้านพญาไพร, code 57030129)
//   user.email:      teacher{N}@SCH-001.local
//             ->     teacher{M}@57030129.local
//             where M continues past any pre-existing @57030129.local users
//             so no UNIQUE collision is possible.
//
// Production usage:
//   docker cp /tmp/fix-payaphrai.js eqap_app:/app/scripts/fix-payaphrai.js
//   docker exec eqap_app node /app/scripts/fix-payaphrai.js          # dry run
//   docker exec eqap_app node /app/scripts/fix-payaphrai.js --apply  # writes

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRONG_SCHOOL_ID = 1;
const RIGHT_SCHOOL_ID = 98;
const WRONG_DOMAIN = '@SCH-001.local';
const RIGHT_DOMAIN_CODE = '57030129';

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`[fix-pyp] mode=${apply ? 'APPLY' : 'DRY-RUN'}`);

  // Sanity-check the two schools first.
  const [wrong, right] = await Promise.all([
    prisma.school.findUnique({
      where: { id: WRONG_SCHOOL_ID },
      select: { id: true, code: true, nameTh: true, name: true },
    }),
    prisma.school.findUnique({
      where: { id: RIGHT_SCHOOL_ID },
      select: { id: true, code: true, nameTh: true, name: true, isActive: true },
    }),
  ]);
  if (!wrong || !right) {
    console.error(`[fix-pyp] FATAL: missing school (wrong=${!!wrong} right=${!!right})`);
    process.exit(1);
  }
  console.log(`[fix-pyp] wrong school = #${wrong.id} ${wrong.code} "${wrong.nameTh}"`);
  console.log(`[fix-pyp] right school = #${right.id} ${right.code} "${right.nameTh}" active=${right.isActive}`);
  if (right.code !== RIGHT_DOMAIN_CODE) {
    console.error(`[fix-pyp] FATAL: school #${right.id} code is "${right.code}", expected "${RIGHT_DOMAIN_CODE}"`);
    process.exit(1);
  }

  // Find existing @57030129.local users so we don't collide on User.email UNIQUE.
  const existingRight = await prisma.user.findMany({
    where: { email: { endsWith: `@${RIGHT_DOMAIN_CODE}.local` } },
    select: { email: true },
  });
  let counter = 0;
  for (const e of existingRight) {
    const m = e.email.match(/^teacher(\d+)@/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > counter) counter = n;
    }
  }
  console.log(`[fix-pyp] existing @${RIGHT_DOMAIN_CODE}.local users = ${existingRight.length}, counter resumes at ${counter + 1}`);

  // The 23 stranded teachers, sorted by user id so the mapping is deterministic.
  const stranded = await prisma.teacher.findMany({
    where: {
      schoolId: WRONG_SCHOOL_ID,
      user: { email: { endsWith: WRONG_DOMAIN } },
    },
    orderBy: { userId: 'asc' },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  console.log(`[fix-pyp] stranded teachers found = ${stranded.length}\n`);

  if (stranded.length === 0) {
    console.log('[fix-pyp] nothing to do — exit clean.');
    await prisma.$disconnect();
    return;
  }

  // Build the rename plan first so we can show it before touching anything.
  const plan = stranded.map((t) => {
    counter += 1;
    return {
      userId: t.user.id,
      teacherId: t.id,
      oldEmail: t.user.email,
      newEmail: `teacher${counter}@${RIGHT_DOMAIN_CODE}.local`,
      name: t.user.name,
    };
  });

  for (const p of plan) {
    console.log(`  user #${p.userId}  ${p.oldEmail.padEnd(28)}  ->  ${p.newEmail.padEnd(34)}  "${p.name}"`);
  }

  // Safety: confirm none of the proposed new emails already exist.
  const proposedEmails = plan.map((p) => p.newEmail);
  const collisions = await prisma.user.findMany({
    where: { email: { in: proposedEmails } },
    select: { email: true },
  });
  if (collisions.length > 0) {
    console.error(`\n[fix-pyp] FATAL: ${collisions.length} proposed emails already exist:`);
    for (const c of collisions) console.error(`  ${c.email}`);
    process.exit(1);
  }

  if (!apply) {
    console.log(`\n[fix-pyp] (dry-run) re-run with --apply to perform the move.`);
    await prisma.$disconnect();
    return;
  }

  // One big transaction so we either repair all 23 or none.
  console.log(`\n[fix-pyp] applying ${plan.length} updates in one transaction...`);
  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      await tx.user.update({
        where: { id: p.userId },
        data: { email: p.newEmail },
      });
      await tx.teacher.update({
        where: { id: p.teacherId },
        data: { schoolId: RIGHT_SCHOOL_ID },
      });
    }
  });

  console.log(`[fix-pyp] done. ${plan.length} teachers moved to school #${RIGHT_SCHOOL_ID}.`);

  // Re-verify
  const after = await prisma.teacher.count({ where: { schoolId: RIGHT_SCHOOL_ID } });
  const stillStranded = await prisma.teacher.count({
    where: { schoolId: WRONG_SCHOOL_ID, user: { email: { endsWith: WRONG_DOMAIN } } },
  });
  console.log(`[fix-pyp] verify: school #${RIGHT_SCHOOL_ID} now has ${after} teachers`);
  console.log(`[fix-pyp] verify: still on school #${WRONG_SCHOOL_ID} with ${WRONG_DOMAIN} = ${stillStranded}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
