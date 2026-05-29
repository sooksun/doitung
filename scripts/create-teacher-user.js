// scripts/create-teacher-user.js
// One-off: create a TEACHER user bound to a specific school.
//
// Mirrors the pattern in app/api/admin/school-directors/route.ts —
//   1. Create User (name/email/hashed password, isActive)
//   2. Upsert UserRole → TEACHER
//   3. Upsert Teacher row → schoolId
//
// To create a different user, just edit the TARGET block below and re-run.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Target user ─────────────────────────────────────────────────────────────
const TARGET = {
  name: 'นายพงศพัทธ์ โพธิ',
  email: 'teacher13@57030136.local',
  password: 'Teacher@123',
  schoolCode: '57030136',  // โรงเรียนบ้านห้วยอื้น
  role: 'TEACHER',
};
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const email = TARGET.email.trim().toLowerCase();

  // Pre-flight checks
  const school = await prisma.school.findUnique({
    where: { code: TARGET.schoolCode },
    select: { id: true, code: true, name: true, nameTh: true, isActive: true },
  });
  if (!school) throw new Error(`ไม่พบโรงเรียน code=${TARGET.schoolCode}`);
  if (!school.isActive) throw new Error(`โรงเรียน ${school.nameTh || school.name} ถูกปิดใช้งานอยู่`);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`มีบัญชี email=${email} อยู่แล้ว (userId=${existing.id})`);
  }

  const role = await prisma.role.findUnique({ where: { name: TARGET.role } });
  if (!role) throw new Error(`ไม่พบ role=${TARGET.role} ในฐานข้อมูล`);

  // Create
  const hashed = await bcrypt.hash(TARGET.password, 10);
  const user = await prisma.user.create({
    data: { name: TARGET.name, email, password: hashed, isActive: true },
    select: { id: true, name: true, email: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  await prisma.teacher.upsert({
    where: { userId: user.id },
    create: { userId: user.id, schoolId: school.id },
    update: { schoolId: school.id },
  });

  console.log('✓ สร้าง user เรียบร้อย');
  console.log(`  userId : ${user.id}`);
  console.log(`  name   : ${user.name}`);
  console.log(`  email  : ${user.email}`);
  console.log(`  role   : ${TARGET.role}`);
  console.log(`  school : ${school.code} ${school.nameTh || school.name} (id=${school.id})`);
}

main()
  .catch((e) => { console.error('✗', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
