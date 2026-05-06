// scripts/import-schools-cra3.js
// One-shot import of สพป.เชียงราย เขต 3 schools from scripts/data/schools-cra3-2568.csv.
// Idempotent — safe to re-run. Upserts SchoolNetwork (code=57030000) + 140 schools + memberships.
//
// Usage:
//   node scripts/import-schools-cra3.js
//   node scripts/import-schools-cra3.js path/to/schools.csv   # override CSV path

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NETWORK_CODE = '57030000';
const NETWORK_NAME = 'สพป.เชียงราย เขต 3';
const PROVINCE = 'เชียงราย';

async function main() {
  const csvPath = process.argv[2] || path.join(__dirname, 'data', 'schools-cra3-2568.csv');
  console.log(`Reading: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // CSV may be UTF-8 (in repo) or TIS-620/Windows-874 (raw download).
  // Detect by reading the first byte; UTF-8 Thai uses 0xE0..0xE3 prefixes; TIS-620 uses 0xA0..0xFB single bytes.
  const buf = fs.readFileSync(csvPath);
  const firstByte = buf[0];
  const text = firstByte >= 0xC0
    ? buf.toString('utf8')
    : new TextDecoder('windows-874').decode(buf);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV appears empty');
    process.exit(1);
  }

  // Header: รหัสเขต,ชื่อเขต,รหัสโรงเรียน,ชื่อโรงเรียน,...
  const dataLines = lines.slice(1);
  console.log(`Rows: ${dataLines.length}`);

  // Upsert network
  const network = await prisma.schoolNetwork.upsert({
    where: { code: NETWORK_CODE },
    update: { name: NETWORK_NAME, nameTh: NETWORK_NAME, isActive: true },
    create: {
      code: NETWORK_CODE,
      name: NETWORK_NAME,
      nameTh: NETWORK_NAME,
      description: `เครือข่ายโรงเรียน ${NETWORK_NAME}`,
      isActive: true,
    },
  });
  console.log(`✓ Network: ${network.code} (id=${network.id})`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of dataLines) {
    const cols = line.split(',');
    const schoolCode = cols[2]?.trim();
    const schoolName = cols[3]?.trim();

    if (!schoolCode || !schoolName) {
      skipped++;
      continue;
    }

    const existing = await prisma.school.findUnique({ where: { code: schoolCode } });

    const school = await prisma.school.upsert({
      where: { code: schoolCode },
      update: {
        name: schoolName,
        nameTh: schoolName,
        province: PROVINCE,
        isActive: true,
      },
      create: {
        code: schoolCode,
        name: schoolName,
        nameTh: schoolName,
        province: PROVINCE,
        isActive: true,
      },
    });

    if (existing) updated++;
    else created++;

    // Membership
    await prisma.schoolNetworkMember.upsert({
      where: { schoolId_networkId: { schoolId: school.id, networkId: network.id } },
      update: { isActive: true },
      create: { schoolId: school.id, networkId: network.id, isActive: true },
    });
  }

  console.log('');
  console.log(`✓ Schools created: ${created}`);
  console.log(`✓ Schools updated: ${updated}`);
  if (skipped) console.log(`⚠ Skipped (bad rows): ${skipped}`);
  console.log(`✓ All schools linked to network ${NETWORK_CODE}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
