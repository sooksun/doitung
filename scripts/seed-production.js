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
      code: 'SCH-001', name: 'Doitung School', nameTh: 'โรงเรียนดอยตุง',
      province: 'เชียงราย', district: 'แม่ฟ้าหลวง', isActive: true,
    },
  });

  const school2 = await prisma.school.upsert({
    where: { code: 'SCH-002' },
    update: {},
    create: {
      code: 'SCH-002', name: 'Mae Fah Luang School', nameTh: 'โรงเรียนแม่ฟ้าหลวง',
      province: 'เชียงราย', district: 'แม่ฟ้าหลวง', isActive: true,
    },
  });
  console.log('✓ Schools created');

  // Network members
  await prisma.schoolNetworkMember.upsert({
    where: { schoolId_networkId: { schoolId: school1.id, networkId: network1.id } },
    update: {},
    create: { networkId: network1.id, schoolId: school1.id, isActive: true },
  });

  // --- ACADEMIC YEAR & TERM ---
  // AcademicYear.year is not @unique, so use findFirst + create
  let academicYear = await prisma.academicYear.findFirst({ where: { year: '2568' } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: { year: '2568' },
    });
  }

  // Term has no termNumber field — use name as identifier
  let term1 = await prisma.term.findFirst({ where: { academicYearId: academicYear.id, name: '1/2568' } });
  if (!term1) {
    term1 = await prisma.term.create({
      data: {
        academicYearId: academicYear.id, name: '1/2568',
        startDate: new Date('2025-05-16'), endDate: new Date('2025-10-10'),
      },
    });
  }
  console.log('✓ Academic year and term created');

  // --- TEACHER (linked to user + school) ---
  const teacher = await prisma.teacher.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, schoolId: school1.id },
  });

  // --- Q-MODEL INSTRUMENT ---
  // Clear old Q-MODEL data if no evaluation sessions exist (fresh setup)
  const oldQModel = await prisma.instrument.findFirst({ where: { type: 'Q_MODEL' } });
  if (oldQModel) {
    const sessionCount = await prisma.evaluationSession.count({ where: { instrumentId: oldQModel.id } });
    if (sessionCount === 0) {
      await prisma.indicator.deleteMany({ where: { instrumentId: oldQModel.id } });
      await prisma.instrumentSection.deleteMany({ where: { instrumentId: oldQModel.id } });
      await prisma.instrument.delete({ where: { id: oldQModel.id } });
    }
  }

  const qInstrument = await prisma.instrument.upsert({
    where: { code: 'Q-MODEL-2568' },
    update: {},
    create: {
      code: 'Q-MODEL-2568', nameTh: 'แบบประเมิน Q-Model ปี 2568',
      nameEn: 'Q-Model Assessment 2568', type: 'Q_MODEL', version: '1.0', isActive: true,
    },
  });

  // 4 sections × 47 indicators จริง
  const dimensions = [
    {
      key: 'Q-Leadership', th: 'Q-Leadership ผู้บริหาร',
      items: [
        'ผู้บริหารและผู้มีส่วนเกี่ยวข้องร่วมกันกำหนดเป้าหมายการพัฒนาคุณภาพผู้เรียน',
        'ผู้บริหารมีการจัดทำแผนงานโครงการที่สนับสนุนเป้าหมายท้าทายของโรงเรียนอย่างชัดเจน',
        'ผู้บริหารเป็นผู้นำในการวางแผนจัดทำและพัฒนาหลักสูตรสถานศึกษา',
        'ผู้บริหารนิเทศติดตามความก้าวหน้าการสอนของครูอย่างต่อเนื่อง',
        'ผู้บริหารติดตามความก้าวหน้าการพัฒนาของผู้เรียนทุกชั้น',
        'ผู้บริหารให้ความสำคัญกับเวลาในการจัดการเรียนการสอนของครูมากกว่างานอื่น',
        'ผู้บริหารสถานศึกษากระตุ้นและสร้างแรงจูงใจด้านวิชาการให้ครู',
        'ผู้บริหารสื่อสารได้ชัดเจน เปิดใจรับฟัง และเชื่อมทุกฝ่ายให้เข้าใจและร่วมมือในทิศทางเดียวกัน',
        'ผู้บริหารสร้างความเชื่อมั่นในคุณภาพนักเรียนต่อผู้ปกครองและชุมชน',
        'ผู้บริหารจัดสรรเวลาเพื่อพัฒนางานวิชาการร่วมกับครูกลุ่มวิชาอย่างชัดเจน',
        'ผู้บริหารมีส่วนร่วมกับภาคีเครือข่ายทั้งภายในและภายนอก',
        'ผู้บริหารสามารถใช้เทคโนโลยีและสารสนเทศเพื่อเพิ่มประสิทธิภาพการบริหาร สนับสนุนครู และยกระดับคุณภาพการศึกษา',
      ],
    },
    {
      key: 'Q-PLC', th: 'Q-PLC ชุมชนแห่งการเรียนรู้',
      items: [
        'มีชั่วโมง PLC ในตารางเรียน',
        'มีกลุ่มเครือ PLC และการกำหนดบทบาทหน้าที่ของสมาชิกในกลุ่ม PLC',
        'ผู้บริหารสถานศึกษาหรือครูผู้รับผิดชอบร่วมเป็นส่วนหนึ่งของกลุ่ม PLC อย่างน้อยหนึ่งกลุ่ม',
        'กระบวนการ PLC มีบรรยากาศที่เปิดกว้าง รับฟังความคิดเห็นของสมาชิก และเปิดพื้นที่ให้ผู้เข้าร่วม PLC ได้แสดงความคิดเห็น',
        'ครูนำแนวทางการจัดการเรียนรู้ ปัญหาคุณภาพนักเรียน โครงการและกิจกรรมมาแลกเปลี่ยนในกลุ่ม',
        'ครูเปิดห้องเรียน (Open Class) เพื่อเป็นเพื่อนคู่คิดสังเกตการสอน และแนวทางพัฒนาคุณภาพนักเรียน',
        'กระบวนการ PLC มีการนำผลการสังเกตการสอนและผลคุณภาพนักเรียนมาพัฒนาต่อยอด',
        'กระบวนการ PLC มีการตั้งคำถามหรือสร้างสมมติฐานเพื่อสนองต่อการพัฒนาการเรียนรู้ของนักเรียน',
        'กระบวนการ PLC สามารถเสริมพลัง สร้างกำลังใจ และให้แนวปฏิบัติที่ดี (Positive Feedback) เพื่อพัฒนานักเรียน',
        'มีการบันทึกการ PLC เพื่อใช้เป็นข้อมูลในการพัฒนา',
      ],
    },
    {
      key: 'Q-Learning', th: 'Q-Learning การจัดการเรียนรู้',
      items: [
        'ครูประสานงานร่วมกันเพื่อช่วยเหลือผู้เรียนรายบุคคล',
        'ครูจัดกิจกรรมการเรียนรู้ให้ผู้เรียนได้ปฏิบัติและสะท้อนผลเพื่อพัฒนาทักษะการเรียนรู้ด้วยตัวเอง',
        'ครูจัดกิจกรรมการเรียนรู้โดยใช้วิธีการมีส่วนร่วมในการทำงานเป็นทีม',
        'ครูจัดกิจกรรมการเรียนรู้ให้ผู้เรียนได้สังเกตตนเองและสะท้อนผล',
        'ครูส่งเสริมให้ผู้เรียนได้เพิ่มพูนศักยภาพตามความสนใจและค้นพบตัวเองตามความแตกต่างระหว่างบุคคล',
        'ครูจัดกิจกรรมการเรียนรู้ให้ผู้เรียนสะท้อนผลด้วยตัวเอง',
        'ครูวิเคราะห์และประเมินผลการเรียนเพื่อปรับปรุงและพัฒนาคุณภาพผู้เรียน',
        'ครูจัดสภาพแวดล้อมและบรรยากาศทั้งในและนอกห้องเรียนที่เอื้อต่อการเรียนรู้',
        'ครูสื่อสารและบริหารจัดการห้องเรียนอย่างมีประสิทธิภาพ',
        'ครูมีพฤติกรรมในการปฏิบัติหน้าที่อย่างดีมีมนุษยธรรมและจรรยาบรรณ',
        'ครูเป็นแบบอย่างที่ดีให้กับนักเรียน',
        'ครูมีจิตวิญญาณความเป็นครู',
      ],
    },
    {
      key: 'Q-Students', th: 'Q-Students ด้านนักเรียน',
      items: [
        'นักเรียนมีทักษะการคิดวิเคราะห์ คิดสร้างสรรค์ และแก้ปัญหา',
        'นักเรียนมีความกล้าแสดงออก กล้าถามสิ่งที่สงสัยและแสวงหาความรู้',
        'นักเรียนสามารถทำงานเป็นทีม ยอมรับความแตกต่าง และมีภาวะผู้นำในระดับที่เหมาะสม',
        'นักเรียนสามารถสร้างความรู้และความเข้าใจด้วยตัวเอง',
        'นักเรียนมีเจตคติที่ดีต่อการเรียนรู้',
        'นักเรียนมีสุขภาวะที่ดีและดูแลตนเองได้อย่างเหมาะสม',
        'นักเรียนมีความรับผิดชอบต่อการกระทำของตนในสังคม',
        'นักเรียนมีมารยาทและรักษาสิ่งแวดล้อม',
        'นักเรียนมีทักษะการใช้ภาษาไทยในการสื่อสาร',
        'นักเรียนมีทักษะในการควบคุมตนเองทั้งด้านพฤติกรรมและอารมณ์',
        'นักเรียนสามารถพึ่งตนเองได้ในการเรียนรู้และการใช้ชีวิตประจำวัน',
        'นักเรียนมีสมาธิในการเรียนรู้',
        'นักเรียนมีจิตสาธารณะและจิตสำนึกความเป็นพลเมืองที่ดี',
      ],
    },
  ];

  for (let d = 0; d < dimensions.length; d++) {
    const dim = dimensions[d];
    let section = await prisma.instrumentSection.findFirst({
      where: { instrumentId: qInstrument.id, nameEn: dim.key },
    });
    if (!section) {
      section = await prisma.instrumentSection.create({
        data: { instrumentId: qInstrument.id, nameTh: dim.th, nameEn: dim.key, order: d + 1 },
      });
    }

    for (let i = 0; i < dim.items.length; i++) {
      const itemCode = `${dim.key}-${String(i + 1).padStart(2, '0')}`;
      const existingInd = await prisma.indicator.findFirst({ where: { instrumentId: qInstrument.id, itemCode } });
      if (!existingInd) {
        await prisma.indicator.create({
          data: {
            instrumentId: qInstrument.id, sectionId: section.id, itemCode,
            textTh: dim.items[i], textEn: dim.items[i],
            scaleType: 'LIKERT_1_5', minScore: 1, maxScore: 5, isActive: true,
          },
        });
      }
    }
  }
  console.log('✓ Q-Model instrument with 4 sections (47 indicators) created');

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
