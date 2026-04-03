// prisma/seed.ts
import { PrismaClient, RoleType, InstrumentType, ScaleType, Quarter, ActionStatus, OKRStatus } from '@prisma/client';
import { hashPassword } from '../lib/auth';

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

  // --- USERS & TEACHERS ---
  // Hash passwords
  const adminPasswordHash = await hashPassword('Admin123');
  const leaderPasswordHash = await hashPassword('Leader123');
  const teacherPasswordHash = await hashPassword('Teacher123');

  // Create admin user (admin@local)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: {
      password: adminPasswordHash, // Update password if user exists
    },
    create: {
      email: 'admin@local',
      password: adminPasswordHash,
      name: 'Admin User',
      roles: {
        create: [{ roleId: adminRole.id }],
      },
    },
  });

  // Also create admin@example.com for backward compatibility
  const adminUserExample = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPasswordHash,
    },
    create: {
      email: 'admin@example.com',
      password: adminPasswordHash,
      name: 'Admin User (Example)',
      roles: {
        create: [{ roleId: adminRole.id }],
      },
    },
  });

  const leaderUser = await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: {
      password: leaderPasswordHash,
    },
    create: {
      email: 'leader@example.com',
      password: leaderPasswordHash,
      name: 'School Leader',
      roles: {
        create: [
          { roleId: leaderRole.id },
          { roleId: teacherRole.id },
        ],
      },
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {
      password: teacherPasswordHash,
    },
    create: {
      email: 'teacher@example.com',
      password: teacherPasswordHash,
      name: 'Thai Language Teacher P1-3',
      roles: {
        create: [{ roleId: teacherRole.id }],
      },
    },
  });

  // --- SCHOOL NETWORKS ---
  const network1 = await prisma.schoolNetwork.upsert({
    where: { code: 'NET-001' },
    update: {},
    create: {
      code: 'NET-001',
      name: 'Northern Schools Network',
      nameTh: 'เครือข่ายโรงเรียนภาคเหนือ',
      description: 'เครือข่ายโรงเรียนในภาคเหนือ',
      isActive: true,
    },
  });

  const network2 = await prisma.schoolNetwork.upsert({
    where: { code: 'NET-002' },
    update: {},
    create: {
      code: 'NET-002',
      name: 'Central Schools Network',
      nameTh: 'เครือข่ายโรงเรียนภาคกลาง',
      description: 'เครือข่ายโรงเรียนในภาคกลาง',
      isActive: true,
    },
  });

  // --- SCHOOL & ACADEMIC YEAR ---
  const school = await prisma.school.upsert({
    where: { code: 'BPP-001' },
    update: {},
    create: {
      code: 'BPP-001',
      name: 'Ban Phaya Phrai School',
      nameTh: 'โรงเรียนบ้านพญาไพร',
      address: '123 หมู่ 1 ถนนพญาไพร',
      province: 'เชียงใหม่',
      district: 'อำเภอเมือง',
      isActive: true,
      networkMemberships: {
        create: [
          {
            networkId: network1.id,
            isActive: true,
          },
        ],
      },
    },
  });

  const school2 = await prisma.school.upsert({
    where: { code: 'BPP-002' },
    update: {},
    create: {
      code: 'BPP-002',
      name: 'Ban Mai School',
      nameTh: 'โรงเรียนบ้านใหม่',
      address: '456 หมู่ 2 ถนนบ้านใหม่',
      province: 'เชียงใหม่',
      district: 'อำเภอเมือง',
      isActive: true,
      networkMemberships: {
        create: [
          {
            networkId: network1.id,
            isActive: true,
          },
        ],
      },
    },
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      year: '2568',
    },
  });

  const term1 = await prisma.term.create({
    data: {
      name: '1/2568',
      academicYearId: academicYear.id,
    },
  });

  const leaderTeacher = await prisma.teacher.upsert({
    where: { userId: leaderUser.id },
    update: {},
    create: {
      userId: leaderUser.id,
      schoolId: school.id,
    },
  });

  const thaiTeacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      schoolId: school.id,
    },
  });

  // --- INSTRUMENTS ---

  // 1) DERS Classroom
  const dersInstrument = await prisma.instrument.upsert({
    where: { code: 'DERS' },
    update: {},
    create: {
      code: 'DERS',
      nameTh: 'แบบประเมินสิ่งแวดล้อมห้องเรียน (DERS)',
      nameEn: 'Developmental Environmental Rating Scale - Classroom',
      description: 'การประเมินสิ่งแวดล้อมในห้องเรียนเพื่อส่งเสริมพัฒนาการผู้เรียน',
      type: InstrumentType.DERS,
      version: '1.0',
    },
  });

  const dersSectionEnvironment = await prisma.instrumentSection.create({
    data: {
      instrumentId: dersInstrument.id,
      nameTh: 'สภาพแวดล้อมและการเข้าถึงสื่อ',
      nameEn: 'Environment & Accessibility',
      order: 1,
    },
  });

  const dersSectionWorkCycle = await prisma.instrumentSection.create({
    data: {
      instrumentId: dersInstrument.id,
      nameTh: 'ช่วงเวลาการทำงานต่อเนื่อง (Work Cycle)',
      nameEn: 'Work Cycle',
      order: 2,
    },
  });

  // DERS Indicators - Based on DERS Classroom structure
  const dersIndicators = await prisma.$transaction([
    // Environment & Accessibility
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionEnvironment.id,
        itemCode: 'DERS-01',
        textTh: 'นักเรียนสามารถเข้าถึงสื่อและมุมการเรียนรู้ทุกมุมได้โดยไม่มีสิ่งกีดขวาง และหยิบใช้สื่อด้วยตนเองได้',
        textEn: 'Children can freely access all learning corners and materials without obstruction, and use them independently.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'มีสิ่งกีดขวางมาก นักเรียนเข้าถึงสื่อได้จำกัด',
          3: 'นักเรียนส่วนใหญ่เข้าถึงสื่อได้ แต่บางมุมยังเข้าถึงยาก',
          5: 'นักเรียนทุกคนเข้าถึงสื่อทุกมุมได้อย่างอิสระ ไม่มีสิ่งกีดขวาง',
        },
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionEnvironment.id,
        itemCode: 'DERS-02',
        textTh: 'ขนาดของเฟอร์นิเจอร์และอุปกรณ์เป็นขนาดเด็ก ทำให้เด็กสามารถใช้งานได้ด้วยตนเอง',
        textEn: 'Furniture and tools are child-sized, allowing independent use.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'เฟอร์นิเจอร์และอุปกรณ์ไม่เหมาะกับขนาดเด็ก เด็กไม่สามารถใช้งานเองได้',
          3: 'เฟอร์นิเจอร์และอุปกรณ์บางส่วนเหมาะกับขนาดเด็ก เด็กสามารถใช้งานเองได้บ้าง',
          5: 'เฟอร์นิเจอร์และอุปกรณ์ทั้งหมดเหมาะกับขนาดเด็ก เด็กสามารถใช้งานเองได้อย่างสะดวก',
        },
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionEnvironment.id,
        itemCode: 'DERS-03',
        textTh: 'ห้องเรียนมีแสงสว่างเพียงพอ อากาศถ่ายเทดี และอุณหภูมิเหมาะสม',
        textEn: 'Classroom has adequate lighting, good ventilation, and appropriate temperature.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'แสงสว่างไม่พอ อากาศไม่ถ่ายเท อุณหภูมิไม่เหมาะสม',
          3: 'แสงสว่าง อากาศ และอุณหภูมิพอใช้ แต่ยังต้องปรับปรุง',
          5: 'แสงสว่างเพียงพอ อากาศถ่ายเทดี อุณหภูมิเหมาะสม',
        },
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionEnvironment.id,
        itemCode: 'DERS-04',
        textTh: 'ห้องเรียนสะอาด เป็นระเบียบ และมีการดูแลรักษาอย่างต่อเนื่อง',
        textEn: 'Classroom is clean, organized, and maintained continuously.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'ห้องเรียนไม่สะอาด ไม่เป็นระเบียบ ไม่มีการดูแลรักษา',
          3: 'ห้องเรียนสะอาดและเป็นระเบียบบ้าง แต่ยังต้องปรับปรุง',
          5: 'ห้องเรียนสะอาด เป็นระเบียบ และมีการดูแลรักษาอย่างต่อเนื่อง',
        },
      },
    }),
    // Work Cycle
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionWorkCycle.id,
        itemCode: 'DERS-05',
        textTh: 'มีการจัดช่วงเวลาการทำงานต่อเนื่องอย่างน้อย 1 ชั่วโมงทุกวัน โดยไม่ถูกขัดจังหวะ',
        textEn: 'There is an uninterrupted work cycle of at least one hour daily.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'ไม่มีการจัดช่วงเวลาการทำงานต่อเนื่อง หรือถูกขัดจังหวะบ่อย',
          3: 'มีการจัดช่วงเวลาการทำงานต่อเนื่องบ้าง แต่ยังถูกขัดจังหวะ',
          5: 'มีการจัดช่วงเวลาการทำงานต่อเนื่องอย่างน้อย 1 ชั่วโมงทุกวัน โดยไม่ถูกขัดจังหวะ',
        },
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionWorkCycle.id,
        itemCode: 'DERS-06',
        textTh: 'นักเรียนมีอิสระในการเลือกกิจกรรมและทำงานตามจังหวะของตนเอง',
        textEn: 'Students have freedom to choose activities and work at their own pace.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'นักเรียนไม่มีอิสระในการเลือกกิจกรรม ต้องทำงานตามที่ครูกำหนด',
          3: 'นักเรียนมีอิสระในการเลือกกิจกรรมบ้าง แต่ยังถูกกำหนดเวลา',
          5: 'นักเรียนมีอิสระในการเลือกกิจกรรมและทำงานตามจังหวะของตนเอง',
        },
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: dersInstrument.id,
        sectionId: dersSectionWorkCycle.id,
        itemCode: 'DERS-07',
        textTh: 'มีการจัดกิจกรรมที่หลากหลายและเหมาะสมกับพัฒนาการของนักเรียน',
        textEn: 'Activities are diverse and appropriate for student development.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
        levelDescriptors: {
          1: 'กิจกรรมไม่หลากหลาย หรือไม่เหมาะสมกับพัฒนาการ',
          3: 'กิจกรรมหลากหลายบ้าง แต่ยังต้องปรับให้เหมาะสมกับพัฒนาการ',
          5: 'มีการจัดกิจกรรมที่หลากหลายและเหมาะสมกับพัฒนาการของนักเรียน',
        },
      },
    }),
  ]);

  console.log(`Seeded DERS indicators: ${dersIndicators.length}`);

  // 2) Thai P.1-3 Self-Assessment
  const thaiInstrument = await prisma.instrument.upsert({
    where: { code: 'THAI_P1_3' },
    update: {},
    create: {
      code: 'THAI_P1_3',
      nameTh: 'แบบประเมินตนเองการจัดการเรียนการสอนภาษาไทย ป.1–3',
      nameEn: 'Self-Assessment: Thai Language Teaching P.1–3',
      description: 'ประเมินการจัดการเรียนการสอนภาษาไทยระดับประถมศึกษาตอนต้น',
      type: InstrumentType.THAI_P1_3,
      version: '1.0',
    },
  });

  const thaiSectionClassroom = await prisma.instrumentSection.create({
    data: {
      instrumentId: thaiInstrument.id,
      nameTh: 'ด้านห้องเรียนและบรรยากาศ',
      nameEn: 'Classroom & Climate',
      order: 1,
    },
  });

  const thaiSectionLearner = await prisma.instrumentSection.create({
    data: {
      instrumentId: thaiInstrument.id,
      nameTh: 'ด้านผู้เรียน',
      nameEn: 'Learners',
      order: 2,
    },
  });

  const thaiSectionTeacher = await prisma.instrumentSection.create({
    data: {
      instrumentId: thaiInstrument.id,
      nameTh: 'ด้านผู้สอน (Facilitator)',
      nameEn: 'Teacher as Facilitator',
      order: 3,
    },
  });

  const thaiSectionProcess = await prisma.instrumentSection.create({
    data: {
      instrumentId: thaiInstrument.id,
      nameTh: 'การจัดกระบวนการเรียนรู้ & ประเมินผล',
      nameEn: 'Learning Process & Assessment',
      order: 4,
    },
  });

  // Thai P.1-3 Indicators - Complete set from OKRs-Table.md
  const thaiIndicators = await prisma.$transaction([
    // O1: ห้องเรียน (KR1.1 - KR1.4)
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionClassroom.id,
        itemCode: 'THAI-CL-01',
        textTh: 'ห้องเรียนมีผังที่นั่งที่สอดคล้องกิจกรรมและสนับสนุนการเรียนรู้ร่วมกัน',
        textEn: 'Classroom seating arrangement aligns with activities and supports collaborative learning.',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionClassroom.id,
        itemCode: 'THAI-CL-02',
        textTh: 'การจัดที่นั่งเอื้อต่อกิจกรรมปฏิบัติ เด็กมองเห็นสื่อได้ชัดเจน มีพื้นที่ให้ครูเข้าถึงทุกกลุ่ม',
        textEn: 'Seating arrangement supports hands-on activities, clear visibility of materials, and teacher access to all groups.',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionClassroom.id,
        itemCode: 'THAI-CL-03',
        textTh: 'ห้องเรียนสะอาด ปลอดภัย แสง–อากาศเพียงพอ และเด็กดูแลร่วมกันทุกวัน',
        textEn: 'Classroom is clean, safe, with adequate lighting and ventilation, and children maintain it together daily.',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionClassroom.id,
        itemCode: 'THAI-CL-04',
        textTh: 'ความสะอาด อากาศถ่ายเท จุดแสงสว่างเพียงพอ',
        textEn: 'Cleanliness, air circulation, and adequate lighting points.',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionClassroom.id,
        itemCode: 'THAI-CL-05',
        textTh: 'กระดานเรียนพร้อมใช้ 100% ในทุกคาบภาษาไทย (สะอาด ไม่มีข้อความรบกวน มีปากกาและที่ลบพร้อม)',
        textEn: 'Whiteboard is ready for use 100% in every Thai class (clean, no distractions, markers and eraser ready).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionClassroom.id,
        itemCode: 'THAI-CL-06',
        textTh: 'ห้องเรียนมีบรรยากาศทางอารมณ์ที่ปลอดภัย เด็กกล้าแสดงออก ไม่มีการบูลลี่ ดูถูก',
        textEn: 'Classroom has emotionally safe atmosphere, children express themselves confidently, no bullying or belittling.',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    // O2: ผู้เรียน (KR2.1 - KR2.3)
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionLearner.id,
        itemCode: 'THAI-ST-01',
        textTh: 'ผู้เรียนมีความสนใจและกระตือรือร้นในชั่วโมงภาษาไทย (สนใจ มีส่วนร่วม ทำงานทันที)',
        textEn: 'Students are interested and enthusiastic in Thai class (engaged, participating, working immediately).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionLearner.id,
        itemCode: 'THAI-ST-02',
        textTh: 'ผู้เรียนกล้าแสดงออก ตั้งคำถาม แสดงความคิดเห็นอย่างมีเหตุผล (ตั้งคำถาม ตอบคำถาม นำเสนออย่างมั่นใจ)',
        textEn: 'Students confidently express themselves, ask questions, and express reasoned opinions (asking, answering, presenting confidently).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionLearner.id,
        itemCode: 'THAI-ST-03',
        textTh: 'ผู้เรียนส่งงานครบและมีความรับผิดชอบร่วมกันในห้องเรียน (ส่งงานครบ เก็บอุปกรณ์ ทำงานส่วนกลางร่วมกัน)',
        textEn: 'Students complete assignments and share responsibility in the classroom (complete work, organize materials, collaborate on shared tasks).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    // O3: ผู้สอน (KR3.1 - KR3.4)
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionTeacher.id,
        itemCode: 'THAI-TC-01',
        textTh: 'ครูกระตุ้นให้ผู้เรียนคิด–พูด–ถาม (กระตุ้นการมีส่วนร่วม ใช้คำถามชวนคิด)',
        textEn: 'Teacher stimulates students to think, speak, and ask (encourages participation, uses thought-provoking questions).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionTeacher.id,
        itemCode: 'THAI-TC-02',
        textTh: 'ครูให้คำอธิบายเป็นขั้นตอนชัดเจนและตรวจสอบความเข้าใจเสมอ (อธิบายเป็นลำดับ เช็กความเข้าใจ)',
        textEn: 'Teacher provides clear step-by-step explanations and always checks understanding (sequential explanation, checks comprehension).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionTeacher.id,
        itemCode: 'THAI-TC-03',
        textTh: 'ครูเดินตรวจ (Monitoring) และให้ Feedback รายคนอย่างมีคุณภาพ (เดินตรวจทั่วถึง กระตุ้นให้คิดมากกว่าบอกคำตอบ)',
        textEn: 'Teacher monitors by walking around and provides quality individual feedback (thorough monitoring, encourages thinking rather than giving answers).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionTeacher.id,
        itemCode: 'THAI-TC-04',
        textTh: 'ครูใช้ภาษาพูดสุภาพ นุ่มนวล และควบคุมอารมณ์ได้ตลอดเวลา (ใช้คำสุภาพ คุมอารมณ์ สร้างแรงบันดาลใจ)',
        textEn: 'Teacher uses polite, gentle language and maintains emotional control at all times (polite words, emotional control, inspiring).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    // O4: กระบวนการเรียนรู้ (KR4.1 - KR4.3)
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionProcess.id,
        itemCode: 'THAI-PR-01',
        textTh: 'มีกิจกรรมฐานใจ/เตรียมความพร้อมก่อนเรียนทุกคาบ (เตรียมอารมณ์ เตรียมจิตใจ)',
        textEn: 'Mindfulness activities/warm-up before every class (emotional preparation, mental preparation).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionProcess.id,
        itemCode: 'THAI-PR-02',
        textTh: 'จัดกิจกรรมการเรียนรู้ครบ 5 รูปแบบ: ทบทวนความรู้เดิม ใช้กระบวนการคิด–ปฏิบัติ ทำงานเป็นทีม ทุกคนมีส่วนร่วม สร้างองค์ความรู้ในตนเอง',
        textEn: 'Learning activities cover 5 types: review prior knowledge, think-practice process, teamwork, everyone participates, construct own knowledge.',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: thaiInstrument.id,
        sectionId: thaiSectionProcess.id,
        itemCode: 'THAI-PR-03',
        textTh: 'เปิดโอกาสให้นักเรียนนำเสนอผลงาน (นำเสนอ เรียนรู้หลายรูปแบบ)',
        textEn: 'Opportunities for students to present their work (presentations, various learning formats).',
        scaleType: ScaleType.LIKERT_1_4,
        minScore: 1,
        maxScore: 4,
      },
    }),
  ]);

  console.log(`Seeded THAI P1-3 indicators: ${thaiIndicators.length}`);

  // 3) Q-Model
  const qModelInstrument = await prisma.instrument.upsert({
    where: { code: 'Q_MODEL' },
    update: {},
    create: {
      code: 'Q_MODEL',
      nameTh: 'แบบตรวจสอบตนเองเพื่อการพัฒนาสู่โรงเรียนคุณภาพ (Q-Model)',
      nameEn: 'Self-Check for School as Quality Community School (Q-Model)',
      description: 'ประเมินองค์ประกอบโรงเรียนคุณภาพ 6 มิติ',
      type: InstrumentType.Q_MODEL,
      version: '1.0',
    },
  });

  const qSecLeadership = await prisma.instrumentSection.create({
    data: {
      instrumentId: qModelInstrument.id,
      nameTh: 'Q-Leadership: ภาวะผู้นำทางวิชาการ',
      nameEn: 'Q-Leadership',
      order: 1,
    },
  });

  const qSecPLC = await prisma.instrumentSection.create({
    data: {
      instrumentId: qModelInstrument.id,
      nameTh: 'Q-PLC: ชุมชนแห่งการเรียนรู้ทางวิชาชีพ',
      nameEn: 'Q-PLC',
      order: 2,
    },
  });

  const qSecLearning = await prisma.instrumentSection.create({
    data: {
      instrumentId: qModelInstrument.id,
      nameTh: 'Q-Learning: การจัดการเรียนรู้',
      nameEn: 'Q-Learning',
      order: 3,
    },
  });

  const qSecGoal = await prisma.instrumentSection.create({
    data: {
      instrumentId: qModelInstrument.id,
      nameTh: 'Q-Goal: เป้าหมายโรงเรียน',
      nameEn: 'Q-Goal',
      order: 4,
    },
  });

  const qSecInfo = await prisma.instrumentSection.create({
    data: {
      instrumentId: qModelInstrument.id,
      nameTh: 'Q-Info: ระบบสารสนเทศ',
      nameEn: 'Q-Info',
      order: 5,
    },
  });

  const qSecNetwork = await prisma.instrumentSection.create({
    data: {
      instrumentId: qModelInstrument.id,
      nameTh: 'Q-Network: เครือข่ายความร่วมมือ',
      nameEn: 'Q-Network',
      order: 6,
    },
  });

  // Q-Model Indicators - Complete set from OKRs-Table.md
  const qIndicators = await prisma.$transaction([
    // Q-Leadership (KR1.1 - KR1.4)
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLeadership.id,
        itemCode: 'Q-L-01',
        textTh: 'ผู้บริหารและผู้มีส่วนเกี่ยวข้องร่วมกันกำหนดกรอบเป้าหมายการพัฒนาคุณภาพผู้เรียนอย่างชัดเจน',
        textEn: 'School leaders and stakeholders jointly define clear student quality goals.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLeadership.id,
        itemCode: 'Q-L-02',
        textTh: 'ผู้บริหารเป็นผู้นำการพัฒนาหลักสูตรสถานศึกษาให้ทันสมัยและสอดคล้องกับท้องถิ่น',
        textEn: 'The principal leads updating the school curriculum to be modern and locally relevant.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLeadership.id,
        itemCode: 'Q-L-03',
        textTh: 'ผู้บริหารนิเทศห้องเรียนและติดตามพัฒนาการของผู้เรียนทุกชั้นอย่างต่อเนื่อง',
        textEn: 'The principal supervises classrooms and continuously monitors student progress across all grade levels.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLeadership.id,
        itemCode: 'Q-L-04',
        textTh: 'ผู้บริหารจัดสภาพแวดล้อมโรงเรียนให้เป็นแหล่งเรียนรู้สะอาด ร่มรื่น ปลอดภัย',
        textEn: 'The principal organizes school environment to be clean, green, safe learning spaces.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    // Q-PLC (KR2.1 - KR2.4)
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecPLC.id,
        itemCode: 'Q-PLC-01',
        textTh: 'โรงเรียนจัดให้มีวง PLC อย่างสม่ำเสมอ และผู้บริหารเป็นสมาชิกจริง ไม่ใช่แค่ประธาน',
        textEn: 'The school regularly organizes PLC sessions where the principal participates as a member, not just a chair.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecPLC.id,
        itemCode: 'Q-PLC-02',
        textTh: 'PLC มีบรรยากาศปลอดภัย เปิดโอกาสทุกคนได้แลกเปลี่ยน',
        textEn: 'PLC has a safe atmosphere where everyone can exchange ideas.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecPLC.id,
        itemCode: 'Q-PLC-03',
        textTh: 'ครูนำแผนการสอน–ผลการสอน–ข้อมูลเด็กเข้าสู่วง PLC เป็นประจำ',
        textEn: 'Teachers regularly bring lesson plans, teaching results, and student data into PLC sessions.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecPLC.id,
        itemCode: 'Q-PLC-04',
        textTh: 'มีการจัด Open Class จริง และใช้ Feedback เชิงบวก',
        textEn: 'Open Class sessions are conducted regularly with positive feedback.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    // Q-Learning (KR3.1 - KR3.3)
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLearning.id,
        itemCode: 'Q-LE-01',
        textTh: 'ครูประสานความร่วมมือกับเพื่อนครู ผู้บริหาร ผู้ปกครอง ช่วยเหลือผู้เรียนรายบุคคล',
        textEn: 'Teachers coordinate with colleagues, administrators, and parents to support individual students.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLearning.id,
        itemCode: 'Q-LE-02',
        textTh: 'กิจกรรมการเรียนรู้เน้นการลงมือปฏิบัติ ทำงานเป็นทีม มีส่วนร่วม',
        textEn: 'Learning activities emphasize hands-on practice, teamwork, and active participation.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecLearning.id,
        itemCode: 'Q-LE-03',
        textTh: 'ผู้เรียนมีโอกาสสร้างองค์ความรู้เอง ค้นพบตนเอง และสะท้อนการเรียนรู้',
        textEn: 'Students have opportunities to construct knowledge, discover themselves, and reflect on learning.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    // Q-Goal (KR4.1 - KR4.3)
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecGoal.id,
        itemCode: 'Q-G-01',
        textTh: 'โรงเรียนมีชุดเป้าหมายคุณภาพผู้เรียนที่ครอบคลุม 3 ด้าน: ผลสัมฤทธิ์–สุขภาวะ–คุณลักษณะ',
        textEn: 'The school has a set of student quality goals covering three dimensions: achievement, well-being, and characteristics.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecGoal.id,
        itemCode: 'Q-G-02',
        textTh: 'ทุกเป้าหมายมีแผนงาน/โครงการ และโครงการพัฒนาครูรองรับ',
        textEn: 'Every goal has supporting plans/projects and teacher development programs.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecGoal.id,
        itemCode: 'Q-G-03',
        textTh: 'ผู้บริหารวางแผนสนับสนุนทรัพยากรให้เป้าหมายสำเร็จ',
        textEn: 'The principal plans resource support to achieve goals.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    // Q-Info (KR5.1 - KR5.4)
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecInfo.id,
        itemCode: 'Q-I-01',
        textTh: 'โรงเรียนมีฐานข้อมูลครู–นักเรียนที่ครบและใช้งานได้จริง',
        textEn: 'The school has a complete and functional teacher-student database.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecInfo.id,
        itemCode: 'Q-I-02',
        textTh: 'มีข้อมูลสนับสนุนระบบดูแลช่วยเหลือนักเรียน',
        textEn: 'There is data supporting the student care and support system.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecInfo.id,
        itemCode: 'Q-I-03',
        textTh: 'ใช้ข้อมูลสนับสนุนการสอนและประกันคุณภาพ',
        textEn: 'Data is used to support teaching and quality assurance.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecInfo.id,
        itemCode: 'Q-I-04',
        textTh: 'ข้อมูลถูกใช้ใน PLC/นิเทศ/สอน อย่างน้อยเดือนละครั้ง',
        textEn: 'Data is used in PLC, supervision, and teaching at least monthly.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    // Q-Network (KR6.1 - KR6.4)
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecNetwork.id,
        itemCode: 'Q-N-01',
        textTh: 'โรงเรียนมีเครือข่ายที่ช่วยหนุนเป้าหมายโรงเรียนอย่างชัดเจน',
        textEn: 'The school has networks that clearly support school goals.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecNetwork.id,
        itemCode: 'Q-N-02',
        textTh: 'โรงเรียนและเครือข่ายร่วมกันกำหนดเป้าหมาย–วิสัยทัศน์–นโยบายเครือข่าย',
        textEn: 'The school and networks jointly define network goals, vision, and policies.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecNetwork.id,
        itemCode: 'Q-N-03',
        textTh: 'โรงเรียนมีบทบาทลงมือทำ–ติดตาม–สื่อสารในเครือข่ายอย่างต่อเนื่อง',
        textEn: 'The school actively participates, monitors, and communicates within networks continuously.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
    prisma.indicator.create({
      data: {
        instrumentId: qModelInstrument.id,
        sectionId: qSecNetwork.id,
        itemCode: 'Q-N-04',
        textTh: 'มีการรายงานผล–สื่อสารข้อมูลเครือข่ายหลากหลายช่องทาง',
        textEn: 'Network results and information are reported and communicated through various channels.',
        scaleType: ScaleType.LIKERT_1_5,
        minScore: 1,
        maxScore: 5,
      },
    }),
  ]);

  console.log(`Seeded Q-Model indicators: ${qIndicators.length}`);

  // --- Sample EvaluationSession + Responses ---

  const evalSession = await prisma.evaluationSession.create({
    data: {
      instrumentId: qModelInstrument.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
      evaluatorId: adminUser.id,
      targetTeacherId: leaderTeacher.id,
      status: 'SUBMITTED',
      note: 'ตัวอย่างการประเมิน Q-Leadership รอบต้นปี',
    },
  });

  await prisma.evaluationResponse.createMany({
    data: [
      {
        evaluationSessionId: evalSession.id,
        indicatorId: qIndicators[0].id, // Q-L-01
        score: 4,
        comment: 'มีการประชุมกำหนดเป้าหมายร่วมกันกับครูและกรรมการสถานศึกษาแล้ว',
      },
      {
        evaluationSessionId: evalSession.id,
        indicatorId: qIndicators[1].id, // Q-L-02
        score: 3,
        comment: 'เริ่มปรับหลักสูตรแล้วบางส่วน ยังต้องพัฒนาต่อ',
      },
    ],
  });

  // --- Sample OKR Objective + KRs linked to Q-Model Indicators ---

  const okrObjective = await prisma.oKRObjective.create({
    data: {
      code: 'O-Q-LEAD-2568',
      title: 'ยกระดับภาวะผู้นำทางวิชาการของโรงเรียนสู่มาตรฐาน Q-Leadership',
      description: 'มุ่งเน้นการกำหนดเป้าหมายผู้เรียนและพัฒนาหลักสูตรตาม Q-Model',
      dimension: 'Q-Leadership',
      status: OKRStatus.ACTIVE,
      schoolId: school.id,
      academicYearId: academicYear.id,
      ownerId: leaderUser.id,
      quarter: Quarter.Q1,
    },
  });

  const kr1 = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrObjective.id,
      title: 'มีกรอบเป้าหมายคุณภาพผู้เรียนร่วมกันอย่างน้อย 1 ชุด',
      description: 'กำหนดร่วมกับครูและผู้มีส่วนเกี่ยวข้อง',
      baseline: 0,
      target: 1,
      current: 0.5,
      unit: 'ชุด',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          {
            indicatorId: qIndicators[0].id, // Q-L-01
            weight: 1.0,
          },
        ],
      },
    },
  });

  const kr2 = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrObjective.id,
      title: 'ปรับปรุงหลักสูตรสถานศึกษาให้แล้วเสร็จ',
      description: 'หลักสูตรใหม่สะท้อนความต้องการผู้เรียนและชุมชน',
      baseline: 0,
      target: 1,
      current: 0.3,
      unit: 'สถานะ',
      quarter: Quarter.Q2,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          {
            indicatorId: qIndicators[1].id, // Q-L-02
            weight: 1.0,
          },
        ],
      },
    },
  });

  // --- Sample OKR Actions (Action Plans) ---
  const action1 = await prisma.oKRAction.create({
    data: {
      keyResultId: kr1.id,
      title: 'เวิร์กช็อปครูและกรรมการสถานศึกษาร่วมกำหนดเป้าหมายคุณภาพผู้เรียน',
      description: 'จัดประชุมเชิงปฏิบัติการเพื่อกำหนดกรอบเป้าหมายร่วมกัน',
      order: 1,
      ownerId: leaderUser.id,
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-05-31'),
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5, // Set Goal: เป้าหมายการพัฒนา
      requiredResources: JSON.stringify({
        budget: '10,000 บาท',
        venue: 'ห้องประชุมโรงเรียน',
        facilitators: ['ผู้อำนวยการ', 'ครูใหญ่'],
      }),
      risks: JSON.stringify({
        risk1: 'อาจมีการเห็นไม่ตรงกัน',
        risk2: 'ครูบางคนอาจไม่เข้าร่วม',
      }),
      mitigation: JSON.stringify({
        mitigation1: 'เตรียมข้อมูลเอกสารอ้างอิงมาล่วงหน้า',
        mitigation2: 'แจ้งล่วงหน้าและจัดเวลาให้เหมาะสม',
      }),
      expectedOutputs: JSON.stringify({
        output1: 'เอกสารกรอบเป้าหมายคุณภาพผู้เรียน 1 ฉบับ',
        output2: 'รายงานการประชุม 1 ฉบับ',
      }),
      expectedOutcomes: JSON.stringify({
        outcome1: 'ครูและกรรมการสถานศึกษามีความเข้าใจเป้าหมายร่วมกัน',
        outcome2: 'มีกรอบเป้าหมายที่ชัดเจนสำหรับการพัฒนาผู้เรียน',
      }),
      evidenceOfSuccess: JSON.stringify({
        evidence1: 'เอกสารกรอบเป้าหมายที่ลงนามรับรอง',
        evidence2: 'รูปภาพ/วิดีโอการประชุม',
        evidence3: 'รายงานการประชุม',
      }),
    },
  });

  const action2 = await prisma.oKRAction.create({
    data: {
      keyResultId: kr1.id,
      title: 'จัดทำ School Goal Canvas และติดในทุกห้องเรียน',
      description: 'สรุปเป้าหมายเป็น Canvas แสดงภาพรวมให้ทุกห้องเรียนเห็น',
      order: 2,
      ownerId: leaderUser.id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-30'),
      status: ActionStatus.PENDING,
      targetDesiredState: 4, // Set Goal: เป้าหมายการพัฒนา
      requiredResources: JSON.stringify({
        materials: 'กระดาษ, ปริ้นเตอร์, วัสดุติดผนัง',
        budget: '5,000 บาท',
      }),
      risks: JSON.stringify({
        risk1: 'อาจลืมติดในบางห้อง',
      }),
      mitigation: JSON.stringify({
        mitigation1: 'ตรวจสอบทุกห้องเรียนก่อนเริ่มปีการศึกษา',
      }),
      expectedOutputs: JSON.stringify({
        output1: 'School Goal Canvas ติดในห้องเรียนทุกห้อง (10 ห้อง)',
      }),
      expectedOutcomes: JSON.stringify({
        outcome1: 'นักเรียนและครูเห็นเป้าหมายร่วมกัน',
        outcome2: 'มีบรรยากาศที่สะท้อนเป้าหมายโรงเรียน',
      }),
      evidenceOfSuccess: JSON.stringify({
        evidence1: 'รูปภาพ Canvas ที่ติดในห้องเรียนทุกห้อง',
      }),
    },
  });

  const action3 = await prisma.oKRAction.create({
    data: {
      keyResultId: kr2.id,
      title: 'ตั้งคณะทำงานหลักสูตรสถานศึกษา (ครู + ชุมชน)',
      description: 'เชิญครูและตัวแทนชุมชนร่วมปรับหลักสูตร',
      order: 1,
      ownerId: leaderUser.id,
      startDate: new Date('2024-05-15'),
      endDate: new Date('2024-08-31'),
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5, // Set Goal: เป้าหมายการพัฒนา
      requiredResources: JSON.stringify({
        budget: '20,000 บาท',
        venue: 'ห้องประชุมโรงเรียน',
        experts: 'อาจารย์มหาวิทยาลัย/ศึกษานิเทศก์',
      }),
      risks: JSON.stringify({
        risk1: 'อาจใช้เวลานานกว่าที่วางแผน',
        risk2: 'อาจมีการต่อต้านการเปลี่ยนแปลง',
      }),
      mitigation: JSON.stringify({
        mitigation1: 'จัดทำแผนเวลาให้ชัดเจนและติดตามเป็นระยะ',
        mitigation2: 'สื่อสารความสำคัญและประโยชน์ให้ชัดเจน',
      }),
      expectedOutputs: JSON.stringify({
        output1: 'หลักสูตรสถานศึกษาใหม่ 1 ฉบับ',
        output2: 'รายงานการทบทวนหลักสูตร 1 ฉบับ',
      }),
      expectedOutcomes: JSON.stringify({
        outcome1: 'หลักสูตรสะท้อนความต้องการผู้เรียนและชุมชน',
        outcome2: 'ครูเข้าใจและยอมรับหลักสูตรใหม่',
      }),
      evidenceOfSuccess: JSON.stringify({
        evidence1: 'เอกสารหลักสูตรสถานศึกษาที่อนุมัติแล้ว',
        evidence2: 'รายงานการประชุมคณะทำงาน',
        evidence3: 'เอกสารการรับรองจากคณะกรรมการสถานศึกษา',
      }),
    },
  });

  console.log('Seed completed with sample OKR:', okrObjective.id, kr1.id, kr2.id);
  console.log('Sample Actions:', action1.id, action2.id, action3.id);

  // --- Sample OKR Action Ratings (การประเมินแต่ละ KA) ---
  const actionRating1 = await prisma.oKRActionRating.create({
    data: {
      actionId: action1.id,
      currentState: 2,  // สภาพที่เป็นอยู่: ระดับ 2 (ต่ำ)
      desiredState: 5,  // สภาพที่คาดหมาย: ระดับ 5 (สูงสุด)
      comment: 'ยังไม่มีการประชุมร่วมกัน ต้องจัดให้ครบทุกฝ่าย',
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionRating2 = await prisma.oKRActionRating.create({
    data: {
      actionId: action2.id,
      currentState: 1,  // ยังไม่เริ่มดำเนินการ
      desiredState: 4,  // เป้าหมายที่ต้องการ
      comment: 'ยังไม่ได้ทำ Canvas ต้องทำในเดือนหน้า',
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionRating3 = await prisma.oKRActionRating.create({
    data: {
      actionId: action3.id,
      currentState: 3,  // เริ่มดำเนินการแล้วบ้าง
      desiredState: 5,  // ต้องการให้สมบูรณ์แบบ
      comment: 'คณะทำงานตั้งแล้ว แต่ยังต้องเพิ่มตัวแทนชุมชน',
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  console.log('Sample Action Ratings:', actionRating1.id, actionRating2.id, actionRating3.id);

  // --- เพิ่ม Actions และ Ratings เพิ่มเติมสำหรับ Q-Leadership ---
  const action1b = await prisma.oKRAction.create({
    data: {
      keyResultId: kr1.id,
      title: 'จัดทำเอกสารกรอบเป้าหมายคุณภาพผู้เรียน',
      description: 'สรุปผลการประชุมเป็นเอกสารอย่างเป็นทางการ',
      order: 3,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: action1b.id,
      currentState: 4,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const action2b = await prisma.oKRAction.create({
    data: {
      keyResultId: kr2.id,
      title: 'ทบทวนและปรับปรุงหลักสูตรให้สอดคล้องกับเป้าหมาย',
      description: 'ปรับหลักสูตรให้สอดคล้องกับกรอบเป้าหมายที่กำหนด',
      order: 2,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: action2b.id,
      currentState: 3,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // --- Additional Demo Data: OKRs for all Q-Dimensions ---
  
  // Q-PLC Objective
  const okrPLC = await prisma.oKRObjective.create({
    data: {
      code: 'O-Q-PLC-2568',
      title: 'พัฒนาชุมชนแห่งการเรียนรู้ทางวิชาชีพ (Q-PLC)',
      description: 'สร้างวัฒนธรรมการเรียนรู้ร่วมกันของครู',
      dimension: 'Q-PLC',
      status: OKRStatus.ACTIVE,
      schoolId: school.id,
      academicYearId: academicYear.id,
      ownerId: leaderUser.id,
      quarter: Quarter.Q1,
    },
  });

  const krPLC = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrPLC.id,
      title: 'จัด PLC อย่างน้อย 2 ครั้งต่อเทอม',
      description: 'ครูร่วมกันวิเคราะห์และพัฒนาการสอน',
      baseline: 0,
      target: 2,
      current: 1,
      unit: 'ครั้ง',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-PLC-01')?.id || qIndicators[4].id, weight: 1.0 },
        ],
      },
    },
  });

  const actionPLC = await prisma.oKRAction.create({
    data: {
      keyResultId: krPLC.id,
      title: 'จัดประชุม PLC วิเคราะห์ผลการเรียนการสอน',
      description: 'ครูร่วมกันวิเคราะห์ปัญหาและหาแนวทางแก้ไข',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionPLC.id,
      currentState: 3,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionPLC2 = await prisma.oKRAction.create({
    data: {
      keyResultId: krPLC.id,
      title: 'จัดทำเอกสารสรุปผลการประชุม PLC',
      description: 'บันทึกผลการประชุมและแนวทางพัฒนาต่อ',
      order: 2,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionPLC2.id,
      currentState: 2,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // Q-Learning Objective
  const okrLearning = await prisma.oKRObjective.create({
    data: {
      code: 'O-Q-LEARN-2568',
      title: 'พัฒนาการจัดการเรียนรู้ (Q-Learning)',
      description: 'ยกระดับคุณภาพการจัดการเรียนรู้',
      dimension: 'Q-Learning',
      status: OKRStatus.ACTIVE,
      schoolId: school.id,
      academicYearId: academicYear.id,
      ownerId: leaderUser.id,
      quarter: Quarter.Q1,
    },
  });

  const krLearning = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrLearning.id,
      title: 'ครูใช้เทคนิคการสอนที่หลากหลาย',
      description: 'เพิ่มเทคนิคการสอนที่เน้นผู้เรียนเป็นศูนย์กลาง',
      baseline: 50,
      target: 80,
      current: 60,
      unit: '%',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-L-01')?.id || qIndicators[7].id, weight: 1.0 },
        ],
      },
    },
  });

  const actionLearning = await prisma.oKRAction.create({
    data: {
      keyResultId: krLearning.id,
      title: 'อบรมเทคนิคการสอนแบบ Active Learning',
      description: 'จัดอบรมให้ครูเรียนรู้เทคนิคการสอนใหม่',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionLearning.id,
      currentState: 2,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionLearning2 = await prisma.oKRAction.create({
    data: {
      keyResultId: krLearning.id,
      title: 'จัดทำคู่มือเทคนิคการสอนสำหรับครู',
      description: 'สรุปเทคนิคการสอนเป็นคู่มืออ้างอิง',
      order: 2,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionLearning2.id,
      currentState: 3,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // Q-Goal Objective
  const okrGoal = await prisma.oKRObjective.create({
    data: {
      code: 'O-Q-GOAL-2568',
      title: 'พัฒนาระบบเป้าหมายโรงเรียน (Q-Goal)',
      description: 'สร้างระบบการติดตามเป้าหมายที่ชัดเจน',
      dimension: 'Q-Goal',
      status: OKRStatus.ACTIVE,
      schoolId: school.id,
      academicYearId: academicYear.id,
      ownerId: leaderUser.id,
      quarter: Quarter.Q1,
    },
  });

  const krGoal = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrGoal.id,
      title: 'มีระบบติดตามเป้าหมายที่ชัดเจน',
      description: 'สร้างระบบ OKR และติดตามผลเป็นระยะ',
      baseline: 0,
      target: 1,
      current: 0.7,
      unit: 'ระบบ',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-G-01')?.id || qIndicators[11].id, weight: 1.0 },
        ],
      },
    },
  });

  const actionGoal = await prisma.oKRAction.create({
    data: {
      keyResultId: krGoal.id,
      title: 'จัดทำ Dashboard ติดตาม OKR',
      description: 'สร้าง Dashboard สำหรับติดตามความก้าวหน้า OKR',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionGoal.id,
      currentState: 4,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionGoal2 = await prisma.oKRAction.create({
    data: {
      keyResultId: krGoal.id,
      title: 'จัดทำรายงานความก้าวหน้า OKR รายเดือน',
      description: 'สรุปความก้าวหน้าและรายงานให้ผู้บริหาร',
      order: 2,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionGoal2.id,
      currentState: 3,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // Q-Info Objective
  const okrInfo = await prisma.oKRObjective.create({
    data: {
      code: 'O-Q-INFO-2568',
      title: 'พัฒนาระบบสารสนเทศ (Q-Info)',
      description: 'ยกระดับระบบสารสนเทศและการจัดการข้อมูล',
      dimension: 'Q-Info',
      status: OKRStatus.ACTIVE,
      schoolId: school.id,
      academicYearId: academicYear.id,
      ownerId: leaderUser.id,
      quarter: Quarter.Q1,
    },
  });

  const krInfo = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrInfo.id,
      title: 'มีระบบสารสนเทศที่ใช้งานได้ดี',
      description: 'พัฒนาระบบฐานข้อมูลและรายงาน',
      baseline: 60,
      target: 90,
      current: 75,
      unit: '%',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-I-01')?.id || qIndicators[15].id, weight: 1.0 },
        ],
      },
    },
  });

  const actionInfo = await prisma.oKRAction.create({
    data: {
      keyResultId: krInfo.id,
      title: 'อัปเดตระบบฐานข้อมูลนักเรียน',
      description: 'ปรับปรุงระบบฐานข้อมูลให้ทันสมัยและใช้งานง่าย',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionInfo.id,
      currentState: 3,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionInfo2 = await prisma.oKRAction.create({
    data: {
      keyResultId: krInfo.id,
      title: 'อบรมครูใช้ระบบสารสนเทศใหม่',
      description: 'จัดอบรมให้ครูสามารถใช้งานระบบได้อย่างมีประสิทธิภาพ',
      order: 2,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionInfo2.id,
      currentState: 2,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // Q-Network Objective
  const okrNetwork = await prisma.oKRObjective.create({
    data: {
      code: 'O-Q-NET-2568',
      title: 'สร้างเครือข่ายความร่วมมือ (Q-Network)',
      description: 'พัฒนาความร่วมมือกับหน่วยงานภายนอก',
      dimension: 'Q-Network',
      status: OKRStatus.ACTIVE,
      schoolId: school.id,
      academicYearId: academicYear.id,
      ownerId: leaderUser.id,
      quarter: Quarter.Q1,
    },
  });

  const krNetwork = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrNetwork.id,
      title: 'มีเครือข่ายความร่วมมืออย่างน้อย 3 หน่วยงาน',
      description: 'สร้างความร่วมมือกับชุมชนและหน่วยงานภายนอก',
      baseline: 1,
      target: 3,
      current: 2,
      unit: 'หน่วยงาน',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-N-01')?.id || qIndicators[19].id, weight: 1.0 },
        ],
      },
    },
  });

  const actionNetwork = await prisma.oKRAction.create({
    data: {
      keyResultId: krNetwork.id,
      title: 'จัดทำ MOU กับหน่วยงานภายนอก',
      description: 'สร้างข้อตกลงความร่วมมือกับชุมชนและหน่วยงาน',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionNetwork.id,
      currentState: 2,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  const actionNetwork2 = await prisma.oKRAction.create({
    data: {
      keyResultId: krNetwork.id,
      title: 'จัดกิจกรรมร่วมกับชุมชน',
      description: 'จัดกิจกรรมที่เปิดโอกาสให้ชุมชนมีส่วนร่วม',
      order: 2,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionNetwork2.id,
      currentState: 3,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // --- เพิ่ม KeyResults และ Actions เพิ่มเติมสำหรับ Q-Leadership ---
  const kr1b = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrObjective.id,
      title: 'พัฒนาระบบการติดตามและประเมินผล',
      description: 'สร้างระบบติดตามความก้าวหน้าอย่างเป็นระบบ',
      baseline: 0,
      target: 1,
      current: 0.6,
      unit: 'ระบบ',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-L-03')?.id || qIndicators[2].id, weight: 1.0 },
        ],
      },
    },
  });

  const action1c = await prisma.oKRAction.create({
    data: {
      keyResultId: kr1b.id,
      title: 'จัดทำระบบรายงานความก้าวหน้า',
      description: 'สร้างระบบรายงานอัตโนมัติ',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 5,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: action1c.id,
      currentState: 3,
      desiredState: 5,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  // --- เพิ่ม KeyResults และ Actions สำหรับ Q-PLC ---
  const krPLC2 = await prisma.oKRKeyResult.create({
    data: {
      objectiveId: okrPLC.id,
      title: 'ครูมีทักษะการวิเคราะห์และพัฒนาการสอน',
      description: 'พัฒนาทักษะครูในการวิเคราะห์ผลการเรียน',
      baseline: 50,
      target: 80,
      current: 65,
      unit: '%',
      quarter: Quarter.Q1,
      ownerId: leaderUser.id,
      indicators: {
        create: [
          { indicatorId: qIndicators.find((i) => i.itemCode === 'Q-PLC-02')?.id || qIndicators[5].id, weight: 1.0 },
        ],
      },
    },
  });

  const actionPLC3 = await prisma.oKRAction.create({
    data: {
      keyResultId: krPLC2.id,
      title: 'อบรมเทคนิคการวิเคราะห์ผลการเรียน',
      description: 'จัดอบรมให้ครูสามารถวิเคราะห์ข้อมูลได้',
      order: 1,
      ownerId: leaderUser.id,
      status: ActionStatus.IN_PROGRESS,
      targetDesiredState: 4,
    },
  });

  await prisma.oKRActionRating.create({
    data: {
      actionId: actionPLC3.id,
      currentState: 2,
      desiredState: 4,
      evaluatorId: leaderUser.id,
      schoolId: school.id,
      academicYearId: academicYear.id,
      termId: term1.id,
    },
  });

  console.log('Demo data created for all Q-Dimensions with multiple actions and ratings');
}

main()
  .then(async () => {
    console.log('Seeding done.');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
