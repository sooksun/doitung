// scripts/migrate-thai-teacher-pairs.js
// One-off, idempotent migration: convert existing Thai ป.1–3 single-evaluator sessions into
// the new SELF + DIRECTOR teacher-pair shape.
//   1. mark each existing THAI_P1_3 session (evaluatorKind = NULL) as SELF
//   2. backfill targetTeacherId from the evaluator's Teacher record (assumes the evaluator IS the teacher)
//   3. create the paired DIRECTOR session (empty DRAFT) owned by the school's SCHOOL_LEADER (ผอ.)
//
// Run MANUALLY, after a DB backup (mysqldump):  node scripts/migrate-thai-teacher-pairs.js
// Idempotent: re-running skips already-migrated sessions and existing DIRECTOR siblings.
// NOT wired into docker-entrypoint.sh — this mutates data and should run once per environment.

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.evaluationSession.findMany({
    where: { instrument: { type: 'THAI_P1_3' }, evaluatorKind: null },
    select: {
      id: true, schoolId: true, instrumentId: true,
      academicYearId: true, termId: true, evaluatorId: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${sessions.length} unmigrated THAI_P1_3 session(s).`);

  let markedSelf = 0;
  let directorsCreated = 0;
  const warnings = [];

  const directorCache = new Map(); // schoolId -> directorUserId | null
  async function findDirector(schoolId) {
    if (directorCache.has(schoolId)) return directorCache.get(schoolId);
    const dir = await prisma.user.findFirst({
      where: {
        isActive: true,
        teacher: { schoolId },
        roles: { some: { role: { name: 'SCHOOL_LEADER' } } },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const id = dir ? dir.id : null;
    directorCache.set(schoolId, id);
    return id;
  }

  for (const s of sessions) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: s.evaluatorId } });
    const targetTeacherId = teacher ? teacher.id : null;
    if (!targetTeacherId) {
      warnings.push(`session ${s.id}: evaluator (user ${s.evaluatorId}) has no Teacher record — marked SELF but targetTeacher left NULL (map manually).`);
    }

    const directorUserId = targetTeacherId ? await findDirector(s.schoolId) : null;

    await prisma.$transaction(async (tx) => {
      await tx.evaluationSession.update({
        where: { id: s.id },
        data: { evaluatorKind: 'SELF', targetTeacherId: targetTeacherId ?? undefined },
      });
      markedSelf++;

      if (targetTeacherId) {
        const existingDir = await tx.evaluationSession.findFirst({
          where: {
            instrumentId: s.instrumentId,
            academicYearId: s.academicYearId,
            termId: s.termId,
            targetTeacherId,
            evaluatorKind: 'DIRECTOR',
          },
        });
        if (!existingDir) {
          if (directorUserId) {
            await tx.evaluationSession.create({
              data: {
                instrumentId: s.instrumentId,
                schoolId: s.schoolId,
                academicYearId: s.academicYearId,
                termId: s.termId,
                evaluatorId: directorUserId,
                targetTeacherId,
                evaluatorKind: 'DIRECTOR',
                status: 'DRAFT',
              },
            });
            directorsCreated++;
          } else {
            warnings.push(`session ${s.id} (school ${s.schoolId}): no SCHOOL_LEADER (ผอ.) bound — DIRECTOR side NOT created.`);
          }
        }
      }
    });
  }

  console.log(`\nDone. marked SELF: ${markedSelf}, DIRECTOR sessions created: ${directorsCreated}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log('  - ' + w);
  }
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
