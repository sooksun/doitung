// scripts/match-schools.ts
// อ่าน de-list.json แล้วเช็คว่าชื่อโรงเรียนแต่ละแห่งมีอยู่ใน DB หรือยัง.
// ใช้: npx tsx scripts/match-schools.ts

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';

interface Row {
  ลำดับที่: number;
  โรงเรียน: string;
  'ชื่อ-นามสกุล': string;
}

async function main() {
  const file = path.resolve(__dirname, 'de-list.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as { sheets: { rows: Row[] }[] };
  const rows = data.sheets[0].rows;

  const schoolNames = Array.from(new Set(rows.map((r) => r.โรงเรียน).filter(Boolean)));
  console.log(`[excel] ${schoolNames.length} unique schools, ${rows.length} teachers`);

  for (const xlsxName of schoolNames) {
    // Try exact match on nameTh first, then on name; then loose contains.
    const exact = await prisma.school.findFirst({
      where: { OR: [{ nameTh: xlsxName }, { name: xlsxName }] },
      select: { id: true, code: true, name: true, nameTh: true, isActive: true },
    });
    if (exact) {
      console.log(`[exact ] ${xlsxName}  ->  #${exact.id} (${exact.code ?? '-'})  active=${exact.isActive}`);
      continue;
    }

    // Strip leading "โรงเรียน" prefix and try again
    const stripped = xlsxName.replace(/^โรงเรียน/, '').trim();
    const partial = await prisma.school.findMany({
      where: {
        OR: [
          { nameTh: { contains: stripped } },
          { name: { contains: stripped } },
        ],
      },
      select: { id: true, code: true, name: true, nameTh: true, isActive: true },
      take: 5,
    });
    if (partial.length === 0) {
      console.log(`[MISS  ] ${xlsxName}`);
    } else {
      console.log(`[fuzzy ] ${xlsxName}`);
      for (const s of partial) {
        console.log(`           candidate #${s.id} code=${s.code ?? '-'} nameTh=${s.nameTh ?? '-'} name=${s.name} active=${s.isActive}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
