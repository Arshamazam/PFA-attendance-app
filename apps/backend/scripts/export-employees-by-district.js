const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, active: true },
    select: {
      name: true,
      email: true,
      designation: true,
      department: true,
      mobilePhone: true,
    },
    orderBy: [{ department: 'asc' }, { name: 'asc' }],
  });

  // CSV header
  const rows = [
    ['District', 'Employee Name', 'Designation', 'Email', 'Mobile', 'Status / Issue'],
  ];

  for (const emp of employees) {
    rows.push([
      emp.department ?? '—',
      emp.name ?? '—',
      emp.designation ?? '—',
      emp.email ?? '—',
      emp.mobilePhone ?? '—',
      '', // blank status column for manual entry
    ]);
  }

  // Escape CSV values
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const outPath = path.join(__dirname, 'employees-by-district.csv');
  fs.writeFileSync(outPath, '﻿' + csv, 'utf8'); // BOM for Excel UTF-8

  console.log(`\n✓ Exported ${employees.length} employees`);
  console.log(`  File: ${outPath}\n`);

  // Summary
  const byDistrict = {};
  for (const emp of employees) {
    const d = emp.department ?? 'Unknown';
    byDistrict[d] = (byDistrict[d] ?? 0) + 1;
  }
  console.log('District summary:');
  for (const [district, count] of Object.entries(byDistrict).sort()) {
    console.log(`  ${district.padEnd(25)} ${count} employees`);
  }
  console.log('');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
