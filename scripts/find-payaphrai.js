// scripts/find-payaphrai.js — locate the correct prod School row for
// "บ้านพญาไพร" so we can move the 23 misseeded teachers to the right school.
//
// Production usage:
//   docker cp /tmp/find-payaphrai.js eqap_app:/app/scripts/find-payaphrai.js
//   docker exec eqap_app node /app/scripts/find-payaphrai.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- School #1 (where 23 พญาไพร teachers were wrongly seeded) ---');
  const wrongHome = await prisma.school.findUnique({
    where: { id: 1 },
    select: { id: true, code: true, name: true, nameTh: true },
  });
  console.log(wrongHome);

  console.log('\n--- Schools matching "พญาไพร" ---');
  const matches = await prisma.school.findMany({
    where: { OR: [{ nameTh: { contains: 'พญาไพร' } }, { name: { contains: 'พญาไพร' } }] },
    select: { id: true, code: true, name: true, nameTh: true, isActive: true },
  });
  for (const s of matches) console.log(s);

  console.log('\n--- Teachers currently on school #1 with @SCH-001.local emails ---');
  const stranded = await prisma.teacher.findMany({
    where: {
      schoolId: 1,
      user: { email: { endsWith: '@SCH-001.local' } },
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  console.log(`count = ${stranded.length}`);
  for (const t of stranded.slice(0, 5)) {
    console.log(`  user #${t.user.id}  ${t.user.email}  "${t.user.name}"`);
  }
  if (stranded.length > 5) console.log(`  ... and ${stranded.length - 5} more`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
