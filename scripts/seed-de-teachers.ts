// scripts/seed-de-teachers.ts
// One-shot seeder: read scripts/de-list.json and insert each row as User +
// UserRole(TEACHER) + Teacher into the database. Idempotent — if a user with
// the generated email already exists, the row is skipped.
//
// Mapping (Excel school name -> School row in DB) was confirmed manually:
//   โรงเรียนบ้านแม่หม้อ           -> #99  code 57030130
//   โรงเรียนบ้านพญาไพร            -> #1   code BPP-001
//   โรงเรียนสามัคคีพัฒนา           -> #103 code 57030134
//   โรงเรียนตำรวจตระเวนชายแดน...87 -> #141 code 57030181
//   โรงเรียนบ้านปางมะหัน          -> #104 code 57030135
//   โรงเรียนบ้านห้วยอิ้น           -> #105 code 57030136   (สะกดใน DB เป็น 'อื้น')
//   โรงเรียนบ้านผาจี              -> #106 code 57030139
//   โรงเรียนบ้านห้วยหยวกป่าโซ      -> #136 code 57030175
//   โรงเรียนบ้านห้วยไร่สามัคคี      -> #109 code 57030143
//
// Run: npx tsx scripts/seed-de-teachers.ts          # dry-run, prints plan
//      npx tsx scripts/seed-de-teachers.ts --apply  # actually writes

import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const DEFAULT_PASSWORD = 'Teacher@123';

const SCHOOL_MAP: Record<string, number> = {
  'โรงเรียนบ้านแม่หม้อ': 99,
  'โรงเรียนบ้านพญาไพร': 1,
  'โรงเรียนสามัคคีพัฒนา': 103,
  'โรงเรียนตำรวจตระเวนชายแดนบำรุงที่ 87': 141,
  'โรงเรียนบ้านปางมะหัน': 104,
  'โรงเรียนบ้านห้วยอิ้น': 105,
  'โรงเรียนบ้านผาจี': 106,
  'โรงเรียนบ้านห้วยหยวกป่าโซ': 136,
  'โรงเรียนบ้านห้วยไร่สามัคคี': 109,
};

interface Row {
  ลำดับที่: number;
  โรงเรียน: string;
  'ชื่อ-นามสกุล': string;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[seed-de] mode=${mode}`);

  const file = path.resolve(__dirname, 'de-list.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as { sheets: { rows: Row[] }[] };
  const rows = data.sheets[0].rows.filter((r) => r.โรงเรียน && r['ชื่อ-นามสกุล']);

  // Pre-load schools so we have their codes
  const schoolIds = Array.from(new Set(Object.values(SCHOOL_MAP)));
  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, code: true, name: true, nameTh: true },
  });
  const schoolById = new Map(schools.map((s) => [s.id, s]));

  // Ensure TEACHER role exists
  const teacherRole = await prisma.role.findUnique({ where: { name: 'TEACHER' } });
  if (!teacherRole) {
    console.error("[seed-de] FATAL: Role 'TEACHER' missing from DB. Run prisma seed first.");
    process.exit(1);
  }
  console.log(`[seed-de] teacher role id=${teacherRole.id}`);

  // Hash password once
  const passwordHash = apply ? await bcrypt.hash(DEFAULT_PASSWORD, 10) : '<dry-run>';

  // Group by school
  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    if (!grouped.has(r.โรงเรียน)) grouped.set(r.โรงเรียน, []);
    grouped.get(r.โรงเรียน)!.push(r);
  }

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [excelName, teachers] of grouped) {
    const schoolId = SCHOOL_MAP[excelName];
    const school = schoolId ? schoolById.get(schoolId) : undefined;
    if (!school) {
      console.error(`[seed-de] SKIP school not mapped: "${excelName}"`);
      totalErrors += teachers.length;
      continue;
    }
    const code = school.code ?? `school-${school.id}`;

    // Find existing counter — look for users whose email matches teacherN@<code>.local
    // to continue numbering instead of restarting.
    const existing = await prisma.user.findMany({
      where: { email: { endsWith: `@${code}.local` } },
      select: { email: true },
    });
    let counter = 0;
    for (const e of existing) {
      const m = e.email.match(/^teacher(\d+)@/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > counter) counter = n;
      }
    }

    console.log(`\n[seed-de] === ${excelName} (school #${school.id} code=${code}) ===`);
    console.log(`           ${teachers.length} teachers from Excel, counter starts at ${counter + 1}`);

    for (const t of teachers) {
      const fullName = t['ชื่อ-นามสกุล'].trim();
      counter += 1;
      const email = `teacher${counter}@${code}.local`;

      // Idempotency: if the email is already taken, bump counter until free.
      // (Should only matter on reruns or if existing users had different name.)
      let safeguard = 0;
      while (await prisma.user.findUnique({ where: { email } })) {
        counter += 1;
        safeguard += 1;
        if (safeguard > 200) {
          throw new Error(`safeguard tripped on ${email}`);
        }
      }

      const label = `teacher${counter}`;
      console.log(`  + ${label.padEnd(11)} ${email.padEnd(40)} ${fullName}`);

      if (!apply) {
        totalSkipped += 1;
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              password: passwordHash,
              name: fullName,
              isActive: true,
            },
          });

          await tx.userRole.create({
            data: { userId: user.id, roleId: teacherRole.id },
          });

          await tx.teacher.create({
            data: { userId: user.id, schoolId: school.id },
          });
        });
        totalCreated += 1;
      } catch (err: any) {
        console.error(`    ! failed: ${err?.message ?? err}`);
        totalErrors += 1;
      }
    }
  }

  console.log('\n[seed-de] summary');
  console.log(`           created   : ${totalCreated}`);
  console.log(`           dry-skip  : ${totalSkipped}`);
  console.log(`           errors    : ${totalErrors}`);
  if (!apply) {
    console.log('\n[seed-de] (dry-run) re-run with --apply to write to DB');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
