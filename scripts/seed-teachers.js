// scripts/seed-teachers.js
// Create N teacher users per active school. Idempotent — safe to re-run.
//
// Usage:
//   node scripts/seed-teachers.js                    # 30 teachers per school (default)
//   node scripts/seed-teachers.js 50                 # 50 teachers per school
//   node scripts/seed-teachers.js 30 --network=57030000   # only schools in network code
//
// Each teacher: User (TEACHER role) + Teacher record linked to school.
// Email pattern: t{N}-{schoolCode}@doitung.local (e.g., t1-57030001@doitung.local)
// Password    : Teacher123 (shared, stored as bcrypt hash)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Teacher123';
const EMAIL_DOMAIN = 'doitung.local';

function parseArgs(argv) {
  let perSchool = 30;
  let networkCode = null;
  for (const a of argv.slice(2)) {
    if (/^\d+$/.test(a)) perSchool = parseInt(a, 10);
    else if (a.startsWith('--network=')) networkCode = a.split('=')[1];
  }
  return { perSchool, networkCode };
}

async function main() {
  const { perSchool, networkCode } = parseArgs(process.argv);
  console.log(`Seeding ${perSchool} teachers per school${networkCode ? ` (network ${networkCode})` : ''}...`);

  const teacherRole = await prisma.role.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: { name: 'TEACHER' },
  });
  // School admin role — granted to the FIRST teacher of each school (t1-{schoolCode}).
  const schoolAdminRole = await prisma.role.upsert({
    where: { name: 'SCHOOL_ADMIN' },
    update: {},
    create: { name: 'SCHOOL_ADMIN' },
  });

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let schools;
  if (networkCode) {
    const network = await prisma.schoolNetwork.findUnique({ where: { code: networkCode } });
    if (!network) {
      console.error(`Network with code ${networkCode} not found`);
      process.exit(1);
    }
    schools = await prisma.school.findMany({
      where: {
        isActive: true,
        networkMemberships: { some: { networkId: network.id, isActive: true } },
      },
      select: { id: true, code: true, nameTh: true, name: true },
      orderBy: { code: 'asc' },
    });
  } else {
    schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameTh: true, name: true },
      orderBy: { code: 'asc' },
    });
  }

  console.log(`Schools to process: ${schools.length}`);
  console.log(`Total users to upsert: ${schools.length * perSchool}`);
  console.log('');

  const t0 = Date.now();
  let processed = 0;
  let errors = 0;

  for (const school of schools) {
    const code = school.code || `s${school.id}`;
    const schoolName = school.nameTh || school.name;

    const tasks = [];
    for (let i = 1; i <= perSchool; i++) {
      const email = `t${i}-${code}@${EMAIL_DOMAIN}`;
      const name = `ครู${i} - ${schoolName}`;

      tasks.push(
        (async () => {
          const user = await prisma.user.upsert({
            where: { email },
            update: { password: passwordHash, name, isActive: true },
            create: {
              email,
              password: passwordHash,
              name,
              isActive: true,
            },
          });

          // Ensure TEACHER role link (idempotent)
          await prisma.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: teacherRole.id } },
            update: {},
            create: { userId: user.id, roleId: teacherRole.id },
          });

          // First teacher of each school is also the SCHOOL_ADMIN (PRD §6).
          if (i === 1) {
            await prisma.userRole.upsert({
              where: { userId_roleId: { userId: user.id, roleId: schoolAdminRole.id } },
              update: {},
              create: { userId: user.id, roleId: schoolAdminRole.id },
            });
          }

          // Teacher record (1 per user, schema constraint)
          await prisma.teacher.upsert({
            where: { userId: user.id },
            update: { schoolId: school.id },
            create: { userId: user.id, schoolId: school.id },
          });
        })().catch((e) => {
          errors++;
          console.error(`  ! ${email}: ${e.message}`);
        })
      );
    }

    await Promise.all(tasks);
    processed++;

    if (processed % 10 === 0 || processed === schools.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ${processed}/${schools.length} schools done (${elapsed}s elapsed)`);
    }
  }

  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  console.log(`✓ Done in ${totalTime}s`);
  console.log(`  Schools processed : ${processed}`);
  console.log(`  Teacher accounts  : ${schools.length * perSchool}`);
  if (errors) console.log(`  Errors            : ${errors}`);
  console.log('');
  console.log(`Login (any teacher):`);
  console.log(`  email    : t{1..${perSchool}}-{schoolCode}@${EMAIL_DOMAIN}`);
  console.log(`  password : ${DEFAULT_PASSWORD}`);
  console.log(`  example  : t1-${schools[0]?.code || '...'}@${EMAIL_DOMAIN}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
