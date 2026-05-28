// scripts/seed-de-teachers.js
// CommonJS twin of seed-de-teachers.ts — runs with plain `node` (no tsx).
//
// Production usage:
//   docker cp /tmp/de-list.json eqap_app:/app/scripts/de-list.json
//   docker exec eqap_app node /app/scripts/seed-de-teachers.js          # dry run
//   docker exec eqap_app node /app/scripts/seed-de-teachers.js --apply  # writes
//
// Behaviour matches the .ts: idempotent (counter advances past existing
// teacherN@<code>.local) and atomic per teacher (User + UserRole + Teacher
// in a single transaction).

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Teacher@123';

const SCHOOL_MAP = {
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

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[seed-de] mode=${mode}`);

  const file = path.resolve(__dirname, 'de-list.json');
  if (!fs.existsSync(file)) {
    console.error(`[seed-de] FATAL: ${file} not found`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const rows = (data.sheets[0].rows || []).filter(
    (r) => r['โรงเรียน'] && r['ชื่อ-นามสกุล']
  );

  const schoolIds = Array.from(new Set(Object.values(SCHOOL_MAP)));
  const schools = await prisma.school.findMany({
    where: { id: { in: schoolIds } },
    select: { id: true, code: true, name: true, nameTh: true },
  });
  const schoolById = new Map(schools.map((s) => [s.id, s]));

  // Show what we found vs expected — helps catch prod id drift.
  console.log(`[seed-de] expected ${schoolIds.length} schools, found ${schools.length} in DB`);
  for (const id of schoolIds) {
    if (!schoolById.has(id)) {
      console.error(`[seed-de]   MISSING school id=${id}`);
    }
  }

  const teacherRole = await prisma.role.findUnique({ where: { name: 'TEACHER' } });
  if (!teacherRole) {
    console.error("[seed-de] FATAL: Role 'TEACHER' missing — run prod seed first");
    process.exit(1);
  }
  console.log(`[seed-de] teacher role id=${teacherRole.id}`);

  const passwordHash = apply ? await bcrypt.hash(DEFAULT_PASSWORD, 10) : '<dry-run>';

  const grouped = new Map();
  for (const r of rows) {
    if (!grouped.has(r['โรงเรียน'])) grouped.set(r['โรงเรียน'], []);
    grouped.get(r['โรงเรียน']).push(r);
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
    const code = school.code || `school-${school.id}`;

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
      let email = `teacher${counter}@${code}.local`;

      let safeguard = 0;
      while (await prisma.user.findUnique({ where: { email } })) {
        counter += 1;
        email = `teacher${counter}@${code}.local`;
        safeguard += 1;
        if (safeguard > 200) throw new Error(`safeguard tripped on ${email}`);
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
            data: { email, password: passwordHash, name: fullName, isActive: true },
          });
          await tx.userRole.create({
            data: { userId: user.id, roleId: teacherRole.id },
          });
          await tx.teacher.create({
            data: { userId: user.id, schoolId: school.id },
          });
        });
        totalCreated += 1;
      } catch (err) {
        console.error(`    ! failed: ${err && err.message ? err.message : err}`);
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
