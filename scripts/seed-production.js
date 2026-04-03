// scripts/seed-production.js
// Standalone seed script for production Docker container
// Run: node /app/scripts/seed-production.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // --- ROLES ---
  const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
  const leaderRole = await prisma.role.upsert({ where: { name: 'SCHOOL_LEADER' }, update: {}, create: { name: 'SCHOOL_LEADER' } });
  const teacherRole = await prisma.role.upsert({ where: { name: 'TEACHER' }, update: {}, create: { name: 'TEACHER' } });
  const supervisorRole = await prisma.role.upsert({ where: { name: 'SUPERVISOR' }, update: {}, create: { name: 'SUPERVISOR' } });
  console.log('✓ Roles created');

  // --- USERS ---
  const adminHash = await bcrypt.hash('Admin123', 10);
  const leaderHash = await bcrypt.hash('Leader123', 10);
  const teacherHash = await bcrypt.hash('Teacher123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: { password: adminHash },
    create: {
      email: 'admin@local', password: adminHash, name: 'Admin User', isActive: true,
      roles: { create: [{ roleId: adminRole.id }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: { password: leaderHash },
    create: {
      email: 'leader@example.com', password: leaderHash, name: 'School Leader', isActive: true,
      roles: { create: [{ roleId: leaderRole.id }, { roleId: teacherRole.id }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: { password: teacherHash },
    create: {
      email: 'teacher@example.com', password: teacherHash, name: 'Teacher', isActive: true,
      roles: { create: [{ roleId: teacherRole.id }] },
    },
  });
  console.log('✓ Users created');

  // --- SCHOOL NETWORK ---
  const network1 = await prisma.schoolNetwork.upsert({
    where: { code: 'NET-001' },
    update: {},
    create: { code: 'NET-001', name: 'Network 1', nameTh: 'เครือข่ายที่ 1', isActive: true },
  });

  // --- SCHOOLS ---
  const school1 = await prisma.school.upsert({
    where: { code: 'SCH-001' },
    update: {},
    create: {
      code: 'SCH-001', nameTh: 'โรงเรียนดอยตุง', nameEn: 'Doitung School',
      province: 'เชียงราย', district: 'แม่ฟ้าหลวง', isActive: true,
    },
  });

  const school2 = await prisma.school.upsert({
    where: { code: 'SCH-002' },
    update: {},
    create: {
      code: 'SCH-002', nameTh: 'โรงเรียนแม่ฟ้าหลวง', nameEn: 'Mae Fah Luang School',
      province: 'เชียงราย', district: 'แม่ฟ้าหลวง', isActive: true,
    },
  });
  console.log('✓ Schools created');

  // Network members
  await prisma.schoolNetworkMember.upsert({
    where: { networkId_schoolId: { networkId: network1.id, schoolId: school1.id } },
    update: {},
    create: { networkId: network1.id, schoolId: school1.id, isActive: true },
  });

  // --- ACADEMIC YEAR & TERM ---
  const academicYear = await prisma.academicYear.upsert({
    where: { year: '2568' },
    update: {},
    create: { year: '2568', startDate: new Date('2025-05-01'), endDate: new Date('2026-04-30'), isActive: true },
  });

  const term1 = await prisma.term.upsert({
    where: { academicYearId_termNumber: { academicYearId: academicYear.id, termNumber: 1 } },
    update: {},
    create: {
      academicYearId: academicYear.id, termNumber: 1,
      startDate: new Date('2025-05-16'), endDate: new Date('2025-10-10'), isActive: true,
    },
  });
  console.log('✓ Academic year and term created');

  // --- TEACHER (linked to user + school) ---
  const teacher = await prisma.teacher.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id, schoolId: school1.id,
      teacherCode: 'T-001', titleTh: 'นาย', firstNameTh: 'ผู้ดูแล', lastNameTh: 'ระบบ',
      isActive: true,
    },
  });

  // --- Q-MODEL INSTRUMENT ---
  const qInstrument = await prisma.instrument.upsert({
    where: { code: 'Q-MODEL-2568' },
    update: {},
    create: {
      code: 'Q-MODEL-2568', nameTh: 'แบบประเมิน Q-Model ปี 2568',
      nameEn: 'Q-Model Assessment 2568', type: 'Q_MODEL', version: '1.0', isActive: true,
    },
  });

  // Q-Model sections & indicators
  const dimensions = [
    { key: 'Q-Leadership', th: 'Q-Leadership: ภาวะผู้นำทางวิชาการ', items: ['การกำหนดทิศทางวิสัยทัศน์', 'การสร้างแรงบันดาลใจทีม', 'การตัดสินใจเชิงวิชาการ', 'การพัฒนาศักยภาพครู'] },
    { key: 'Q-PLC', th: 'Q-PLC: ชุมชนแห่งการเรียนรู้', items: ['การแลกเปลี่ยนเรียนรู้', 'การพัฒนาวิชาชีพร่วมกัน', 'การสังเกตการสอน', 'การสะท้อนคิด'] },
    { key: 'Q-Learning', th: 'Q-Learning: การจัดการเรียนรู้', items: ['การออกแบบการเรียนรู้', 'เทคนิคการสอน', 'การใช้สื่อและเทคโนโลยี', 'การวัดและประเมินผล'] },
    { key: 'Q-Goal', th: 'Q-Goal: เป้าหมายโรงเรียน', items: ['การกำหนดเป้าหมาย', 'การติดตามผล', 'การรายงานผล'] },
    { key: 'Q-Info', th: 'Q-Info: ระบบสารสนเทศ', items: ['ระบบข้อมูลนักเรียน', 'ระบบข้อมูลครู', 'การใช้ข้อมูลเพื่อพัฒนา'] },
    { key: 'Q-Network', th: 'Q-Network: เครือข่ายความร่วมมือ', items: ['ความร่วมมือกับผู้ปกครอง', 'ความร่วมมือกับชุมชน', 'ความร่วมมือระหว่างโรงเรียน'] },
  ];

  for (let d = 0; d < dimensions.length; d++) {
    const dim = dimensions[d];
    const section = await prisma.instrumentSection.upsert({
      where: { instrumentId_nameTh: { instrumentId: qInstrument.id, nameTh: dim.th } },
      update: {},
      create: { instrumentId: qInstrument.id, nameTh: dim.th, nameEn: dim.key, order: d + 1 },
    });

    for (let i = 0; i < dim.items.length; i++) {
      const itemCode = `${dim.key}-${String(i + 1).padStart(2, '0')}`;
      const existingInd = await prisma.indicator.findFirst({ where: { instrumentId: qInstrument.id, itemCode } });
      if (!existingInd) {
        await prisma.indicator.create({
          data: {
            instrumentId: qInstrument.id, sectionId: section.id, itemCode,
            textTh: dim.items[i], textEn: dim.items[i],
            scaleType: 'LIKERT_5', minScore: 1, maxScore: 5, isActive: true,
          },
        });
      }
    }
  }
  console.log('✓ Q-Model instrument with 6 dimensions created');

  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Login accounts:');
  console.log('  admin@local       / Admin123');
  console.log('  leader@example.com / Leader123');
  console.log('  teacher@example.com / Teacher123');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
