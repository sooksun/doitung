// prisma/seed.ts
// Dev seed — mirrors scripts/seed-production.js: 4 Q-Model sections × 47 indicators, no OKR.
import { PrismaClient, RoleType } from '@prisma/client';
import { hashPassword } from '../lib/auth';
// CommonJS interop — the rubric file is JS so it stays callable from both
// `node scripts/seed-production.js` and `tsx prisma/seed.ts`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Q_MODEL_RUBRICS: Record<string, Record<number, string>> = require('../scripts/data/q-model-rubrics');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const THAI_P1_3: { key: string; th: string; items: { code: string; text: string; levels: Record<string, string> }[] }[] = require('../scripts/data/thai-p1-3');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- ROLES ---
  const adminRole = await prisma.role.upsert({
    where: { name: RoleType.ADMIN },
    update: {},
    create: { name: RoleType.ADMIN },
  });
  const leaderRole = await prisma.role.upsert({
    where: { name: RoleType.SCHOOL_LEADER },
    update: {},
    create: { name: RoleType.SCHOOL_LEADER },
  });
  const teacherRole = await prisma.role.upsert({
    where: { name: RoleType.TEACHER },
    update: {},
    create: { name: RoleType.TEACHER },
  });
  await prisma.role.upsert({
    where: { name: RoleType.SUPERVISOR },
    update: {},
    create: { name: RoleType.SUPERVISOR },
  });

  // --- USERS ---
  const adminHash = await hashPassword('Admin123');
  const leaderHash = await hashPassword('Leader123');
  const teacherHash = await hashPassword('Teacher123');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: { password: adminHash },
    create: {
      email: 'admin@local',
      password: adminHash,
      name: 'Admin User',
      roles: { create: [{ roleId: adminRole.id }] },
    },
  });

  const leaderUser = await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: { password: leaderHash },
    create: {
      email: 'leader@example.com',
      password: leaderHash,
      name: 'School Leader',
      roles: {
        create: [{ roleId: leaderRole.id }, { roleId: teacherRole.id }],
      },
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: { password: teacherHash },
    create: {
      email: 'teacher@example.com',
      password: teacherHash,
      name: 'Teacher',
      roles: { create: [{ roleId: teacherRole.id }] },
    },
  });
  console.log('✓ Roles + users');

  // --- NETWORKS ---
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
      code: 'SCH-001',
      name: 'Doitung School',
      nameTh: 'โรงเรียนดอยตุง',
      province: 'เชียงราย',
      district: 'แม่ฟ้าหลวง',
      isActive: true,
    },
  });

  const school2 = await prisma.school.upsert({
    where: { code: 'SCH-002' },
    update: {},
    create: {
      code: 'SCH-002',
      name: 'Mae Fah Luang School',
      nameTh: 'โรงเรียนแม่ฟ้าหลวง',
      province: 'เชียงราย',
      district: 'แม่ฟ้าหลวง',
      isActive: true,
    },
  });

  await prisma.schoolNetworkMember.upsert({
    where: { schoolId_networkId: { schoolId: school1.id, networkId: network1.id } },
    update: {},
    create: { networkId: network1.id, schoolId: school1.id, isActive: true },
  });
  await prisma.schoolNetworkMember.upsert({
    where: { schoolId_networkId: { schoolId: school2.id, networkId: network1.id } },
    update: {},
    create: { networkId: network1.id, schoolId: school2.id, isActive: true },
  });
  console.log('✓ Networks + schools');

  // --- ACADEMIC YEAR + TERM (findFirst since `year` is not unique) ---
  let academicYear = await prisma.academicYear.findFirst({ where: { year: '2568' } });
  if (!academicYear) {
    academicYear = await prisma.academicYear.create({ data: { year: '2568' } });
  }

  let term1 = await prisma.term.findFirst({
    where: { academicYearId: academicYear.id, name: '1/2568' },
  });
  if (!term1) {
    term1 = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        name: '1/2568',
        startDate: new Date('2025-05-16'),
        endDate: new Date('2025-10-10'),
      },
    });
  }
  console.log('✓ Academic year + term');

  // --- TEACHERS ---
  await prisma.teacher.upsert({
    where: { userId: leaderUser.id },
    update: {},
    create: { userId: leaderUser.id, schoolId: school1.id },
  });
  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, schoolId: school1.id },
  });

  // --- Q-MODEL INSTRUMENT (additive — kept in sync with scripts/seed-production.js) ---
  // Both seed paths must be additive only. Structural indicator changes go through
  // dedicated migration scripts, not through reseeding.
  const qInstrument = await prisma.instrument.upsert({
    where: { code: 'Q-MODEL-2568' },
    update: {},
    create: {
      code: 'Q-MODEL-2568',
      nameTh: 'แบบประเมิน Q-Model ปี 2568',
      nameEn: 'Q-Model Assessment 2568',
      type: 'Q_MODEL',
      version: '1.0',
      isActive: true,
    },
  });

  // 4 sections × 47 indicators (real data from production system)
  const dimensions = [
    {
      key: 'Q-Leadership',
      th: 'Q-Leadership ผู้บริหาร',
      items: [
        { code: 'L1', text: 'ผู้บริหารและผู้มีส่วนเกี่ยวข้องร่วมกันกำหนดกรอบเป้าหมายการพัฒนาคุณภาพผู้เรียน' },
        { code: 'L2', text: 'ผู้บริหารมีการจัดทำแผนงานโครงการที่สนับสนุนเป้าหมายที่ท้าทายของโรงเรียนอย่างชัดเจน' },
        { code: 'L3', text: 'ผู้บริหารเป็นผู้นำในการวางแผนจัดทำและพัฒนาหลักสูตรสถานศึกษา' },
        { code: 'L4', text: 'ผู้บริหารนิเทศติดตามความก้าวหน้าการสอนของครูอย่างต่อเนื่อง' },
        { code: 'L5', text: 'ผู้บริหารติดตามความก้าวหน้าพัฒนาการของผู้เรียนทุกชั้น' },
        { code: 'L6', text: 'ผู้บริหารให้ความสำคัญกับเวลาในการจัดการเรียนการสอนของครูมากกว่างานอื่น' },
        { code: 'L7', text: 'ผู้บริหารสถานศึกษากระตุ้นและสร้างแรงจูงใจด้านวิชาการให้ครู' },
        { code: 'L8', text: 'ผู้บริหารสื่อสารได้ชัดเจน เปิดใจรับฟัง และเชื่อมทุกฝ่ายให้เข้าใจและร่วมมือไปในทิศทางเดียวกัน' },
        { code: 'L9', text: 'ผู้บริหารสร้างความเชื่อมั่นในคุณภาพนักเรียนต่อผู้ปกครองและชุมชน' },
        { code: 'L10', text: 'ผู้บริหารจัดสรรเวลาเพื่อพัฒนางานวิชาการร่วมกับครูไว้อย่างชัดเจน' },
        { code: 'L11', text: 'ผู้บริหารมีส่วนร่วมกับภาคีเครือข่ายทั้งภายในและภายนอก' },
        { code: 'L12', text: 'ผู้บริหารสามารถใช้เทคโนโลยีและสารสนเทศ เพื่อเพิ่มประสิทธิภาพการบริหาร สนับสนุนครู และยกระดับคุณภาพการเรียนรู้อย่างเป็นรูปธรรม' },
      ],
    },
    {
      key: 'Q-PLC',
      th: 'Q-PLC ชุมชนแห่งการเรียนรู้',
      items: [
        { code: 'PLC1', text: 'มีชั่วโมง PLC ในตารางเรียน' },
        { code: 'PLC2', text: 'มีกลุ่มหรือวง PLC และการกำหนดบทบาทหน้าที่ของสมาชิกในวง PLC' },
        { code: 'PLC3', text: 'ผู้บริหารสถานศึกษาหรือครูผู้นำร่วมพบปะพูดคุยและเป็นส่วนหนึ่งของกลุ่ม PLC อย่างสม่ำเสมอ' },
        { code: 'PLC4', text: 'กระบวนการ PLC มีบรรยากาศที่ปลอดภัย รับฟังความคิดเห็นของทุกคน และเปิดพื้นที่ให้ผู้เข้าร่วม PLC ได้มีโอกาสแลกเปลี่ยนความคิดเห็นอย่างทั่วถึง' },
        { code: 'PLC5', text: 'ครูมีการนำแผนการจัดการเรียนรู้ ปัญหาพฤติกรรมนักเรียน โครงการ กิจกรรมและเข้าร่วมพูดคุยแลกเปลี่ยนเรียนรู้ในวง PLC' },
        { code: 'PLC6', text: 'ครูเปิดห้องเรียน (Open Class) เพื่อให้เพื่อนครูเข้ามาสังเกตการสอน และแนวทางแก้ไขพฤติกรรมนักเรียน โครงการ กิจกรรมต่างๆ ภายในโรงเรียน' },
        { code: 'PLC7', text: 'กระบวนการ PLC มีการนำผลการสังเกตการจัดการเรียนรู้และแนวทางแก้ไขพฤติกรรมนักเรียน โครงการ กิจกรรมต่างๆ เพื่อสะท้อนแลกเปลี่ยนในวง PLC' },
        { code: 'PLC8', text: 'กระบวนการ PLC มีการตั้งคำถามชวนคิดถึงผลลัพธ์ที่เกิดขึ้นเพื่อการดูแลช่วยเหลือนักเรียน' },
        { code: 'PLC9', text: 'กระบวนการ PLC สามารถเสริมพลัง สร้างกำลังใจ ให้คำแนะนำป้อนกลับเชิงบวก (Positive Feedback) เพื่อให้ครูเกิดแรงบันดาลใจในการยกระดับและพัฒนาตนเองอย่างต่อเนื่อง' },
        { code: 'PLC10', text: 'มีการบันทึกการ PLC เพื่อใช้เป็นข้อมูลในการพัฒนา' },
      ],
    },
    {
      key: 'Q-Learning',
      th: 'Q-Learning การจัดการเรียนรู้',
      items: [
        { code: 'T1', text: 'ครูประสานความร่วมมือกับเพื่อนครู ผู้บริหารสถานศึกษาผู้ปกครองเพื่อช่วยเหลือผู้เรียนรายบุคคล' },
        { code: 'T2', text: 'ครูจัดกิจกรรมการเรียนรู้โดยให้ผู้เรียนได้ลงมือปฏิบัติและสะท้อนผลการเรียนรู้ด้วยตนเอง' },
        { code: 'T3', text: 'ครูจัดกิจกรรมการเรียนรู้ด้วยกระบวนการมีส่วนร่วมและทำงานเป็นทีม' },
        { code: 'T4', text: 'ครูจัดกิจกรรมการเรียนรู้ที่เน้นผู้เรียนให้สร้างองค์ความรู้ด้วยตนเอง' },
        { code: 'T5', text: 'ครูส่งเสริมให้ผู้เรียนได้พัฒนาศักยภาพตามความสนใจโดยคำนึงถึงความแตกต่างระหว่างบุคคล' },
        { code: 'T6', text: 'ครูจัดกิจกรรมการเรียนรู้โดยให้ผู้เรียนสะท้อนผลการเรียนรู้ด้วยตนเอง' },
        { code: 'T7', text: 'ครูนำผลการวัดและประเมินผลการเรียนรู้มาปรับปรุงและพัฒนาคุณภาพผู้เรียน' },
        { code: 'T8', text: 'ครูจัดสภาพแวดล้อมและบรรยากาศในห้องเรียนเอื้อต่อการเรียนรู้' },
        { code: 'T9', text: 'ครูสื่อสารและบริหารจัดการชั้นเรียนเชิงบวก เช่น มีความเมตตา ใช้คำพูดสุภาพ นุ่มนวล เป็นมิตร ใช้น้ำเสียงปกติ ไม่ตำหนิ' },
        { code: 'T10', text: 'ครูมีความพึงพอใจในการปฏิบัติหน้าที่ รู้สึกมั่นคงปลอดภัยในการทำงาน' },
        { code: 'T11', text: 'ครูเป็นแบบอย่างที่ดีให้กับนักเรียน' },
        { code: 'T12', text: 'ครูจัดการเรียนรู้ที่เชื่อมโยงกับสถานการณ์ในชีวิตประจำวันและสถานการณ์ปัจจุบัน' },
      ],
    },
    {
      key: 'Q-Students',
      th: 'Q-Students ด้านนักเรียน',
      items: [
        { code: 'S1', text: 'นักเรียนมีทักษะการคิดวิเคราะห์ คิดสร้างสรรค์ และแก้ปัญหา' },
        { code: 'S2', text: 'นักเรียนมีความกล้าแสดงออก กล้าแสดงความคิดเห็นอย่างมีเหตุผล' },
        { code: 'S3', text: 'นักเรียนมีทักษะการทำงานเป็นทีม ยอมรับความคิดเห็นซึ่งกันและกัน มีความเป็นผู้นำและผู้ตามที่ดี' },
        { code: 'S4', text: 'นักเรียนสามารถแสวงหาความรู้และสร้างองค์ความรู้ด้วยตนเอง' },
        { code: 'S5', text: 'นักเรียนมีเจตคติที่ดีต่อการเรียนรู้' },
        { code: 'S6', text: 'นักเรียนมีสุขภาวะที่ดี และดูแลตนเองให้ปลอดภัยได้' },
        { code: 'S7', text: 'นักเรียนมีความรับผิดชอบต่อภารกิจที่ได้รับมอบหมาย' },
        { code: 'S8', text: 'นักเรียนมีมารยาททางสังคม' },
        { code: 'S9', text: 'นักเรียนมีทักษะการใช้ภาษาไทยในการสื่อสาร' },
        { code: 'S10', text: 'นักเรียนมีทักษะในการควบคุมตนเอง ทั้งด้านพฤติกรรมและอารมณ์' },
        { code: 'S11', text: 'นักเรียนสามารถพึ่งพาตนเองได้ทั้งการเรียนรู้และการใช้ชีวิตประจำวัน' },
        { code: 'S12', text: 'นักเรียนมีสมาธิในการเรียนรู้' },
        { code: 'S13', text: 'นักเรียนมีจริยธรรม จิตสำนึกและจิตสาธารณะที่ดี' },
      ],
    },
  ];

  for (let d = 0; d < dimensions.length; d++) {
    const dim = dimensions[d];
    const section = await prisma.instrumentSection.create({
      data: {
        instrumentId: qInstrument.id,
        nameTh: dim.th,
        nameEn: dim.key,
        order: d + 1,
      },
    });
    for (const item of dim.items) {
      await prisma.indicator.create({
        data: {
          instrumentId: qInstrument.id,
          sectionId: section.id,
          itemCode: item.code,
          textTh: item.text,
          textEn: item.code,
          scaleType: 'LIKERT_1_5',
          minScore: 1,
          maxScore: 5,
          isActive: true,
          // 5-level rubric pulled from the canonical PDF; surfaced on the
          // assessment page as a foldable row under each indicator.
          levelDescriptors: Q_MODEL_RUBRICS[item.code] ?? undefined,
        },
      });
    }
  }
  console.log('✓ Q-Model: 4 sections × 47 indicators');

  // --- THAI P.1–3 SELF-ASSESSMENT INSTRUMENT (idempotent — kept in sync with seed-production.js) ---
  // Single-rating LIKERT_1_4 with a 4-level rubric per indicator (ระดับ 4 ดีเยี่ยม → 1 ต้องปรับปรุง).
  // Canonical data: scripts/data/thai-p1-3.js (จาก docs/Rubric_thai_12 Dec 2025.docx) — 4 ด้าน / 50 ตัวชี้วัด.
  const thaiInstrument = await prisma.instrument.upsert({
    where: { code: 'THAI_P1_3' },
    update: {},
    create: {
      code: 'THAI_P1_3',
      nameTh: 'แบบประเมินตนเองการจัดการเรียนการสอนภาษาไทย ป.1–3',
      nameEn: 'Self-Assessment: Thai Language Teaching P.1–3',
      description: 'ประเมินการจัดการเรียนการสอนภาษาไทยระดับประถมศึกษาตอนต้น',
      type: 'THAI_P1_3',
      version: '1.0',
      isActive: true,
    },
  });

  for (let s = 0; s < THAI_P1_3.length; s++) {
    const sec = THAI_P1_3[s];
    let section = await prisma.instrumentSection.findFirst({
      where: { instrumentId: thaiInstrument.id, nameEn: sec.key },
    });
    if (!section) {
      section = await prisma.instrumentSection.create({
        data: { instrumentId: thaiInstrument.id, nameTh: sec.th, nameEn: sec.key, order: s + 1 },
      });
    }
    for (const item of sec.items) {
      const existing = await prisma.indicator.findFirst({
        where: { instrumentId: thaiInstrument.id, itemCode: item.code },
      });
      if (!existing) {
        await prisma.indicator.create({
          data: {
            instrumentId: thaiInstrument.id,
            sectionId: section.id,
            itemCode: item.code,
            textTh: item.text,
            textEn: item.code,
            scaleType: 'LIKERT_1_4',
            minScore: 1,
            maxScore: 4,
            isActive: true,
            levelDescriptors: item.levels,
          },
        });
      } else {
        const cur = JSON.stringify(existing.levelDescriptors ?? null);
        const next = JSON.stringify(item.levels);
        if (cur !== next) {
          await prisma.indicator.update({ where: { id: existing.id }, data: { levelDescriptors: item.levels } });
        }
      }
    }
  }
  console.log('✓ Thai P.1–3: 5 sections × 50 indicators (with rubric)');

  console.log('');
  console.log('🎉 Seed complete!');
  console.log('Login: admin@local / Admin123');
  console.log('       leader@example.com / Leader123');
  console.log('       teacher@example.com / Teacher123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
