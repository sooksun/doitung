// scripts/export-school-admins.js
// Export every active user with SCHOOL_ADMIN role to a CSV.
//
// Output: ./exports/school-admins-<YYYYMMDD-HHmm>.csv
// Columns: userId, email, name, isActive, roles, schoolCode, schoolName

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Always quote — keeps Excel/LibreOffice happy with commas, quotes, and Thai.
  return `"${s.replace(/"/g, '""')}"`;
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      roles: { some: { role: { name: 'SCHOOL_ADMIN' } } },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      roles: { select: { role: { select: { name: true } } } },
      teacher: {
        select: {
          school: { select: { code: true, nameTh: true, name: true } },
        },
      },
    },
  });

  const outDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `school-admins-${ts()}.csv`);

  // UTF-8 BOM so Excel opens Thai correctly on double-click.
  const lines = ['﻿' + ['userId', 'email', 'name', 'isActive', 'roles', 'schoolCode', 'schoolName'].map(csvCell).join(',')];

  for (const u of users) {
    const roles = u.roles.map((r) => r.role.name).sort().join('|');
    const sc = u.teacher?.school;
    lines.push([
      u.id,
      u.email,
      u.name,
      u.isActive ? 'true' : 'false',
      roles,
      sc?.code ?? '',
      sc?.nameTh || sc?.name || '',
    ].map(csvCell).join(','));
  }

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(`Wrote ${users.length} rows → ${outFile}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
