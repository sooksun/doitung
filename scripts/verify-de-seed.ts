// scripts/verify-de-seed.ts — quick sanity check after seeding teachers.
import { prisma } from '../lib/prisma';

const SCHOOL_IDS = [99, 1, 103, 141, 104, 105, 106, 136, 109];

async function main() {
  for (const id of SCHOOL_IDS) {
    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, code: true, nameTh: true, name: true, _count: { select: { teachers: true } } },
    });
    if (!school) {
      console.log(`#${id} MISSING`);
      continue;
    }
    console.log(`#${school.id}  code=${school.code ?? '-'}  ${school.nameTh ?? school.name}  teachers=${school._count.teachers}`);
  }

  const total = await prisma.teacher.count();
  const totalUsers = await prisma.user.count();
  console.log(`---`);
  console.log(`Total teachers in DB: ${total}`);
  console.log(`Total users in DB   : ${totalUsers}`);

  // Sample first 3 created users to confirm role attached
  const sample = await prisma.user.findMany({
    where: { email: { endsWith: '.local' } },
    take: 3,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      roles: { include: { role: true } },
      teacher: { include: { school: { select: { id: true, code: true, nameTh: true } } } },
    },
  });
  console.log(`---`);
  console.log(`Sample of newest users:`);
  for (const u of sample) {
    const roles = u.roles.map((r) => r.role.name).join(',');
    const school = u.teacher?.school ? `#${u.teacher.school.id} ${u.teacher.school.nameTh}` : 'no teacher row';
    console.log(`  #${u.id} ${u.email}  name="${u.name}"  roles=[${roles}]  school=${school}`);
  }

  await prisma.$disconnect();
}

main();
