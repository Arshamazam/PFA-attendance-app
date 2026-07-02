import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DROPDOWN_SEEDS = [
  {
    fieldName: 'department', fieldLabel: 'Department', fieldType: 'Department', displayOrder: 1,
    values: [
      { value: 'Lahore', label: 'Lahore', displayOrder: 1 },
      { value: 'Islamabad', label: 'Islamabad', displayOrder: 2 },
      { value: 'Multan', label: 'Multan', displayOrder: 3 },
      { value: 'Peshawar', label: 'Peshawar', displayOrder: 4 },
      { value: 'Quetta', label: 'Quetta', displayOrder: 5 },
      { value: 'Faisalabad', label: 'Faisalabad', displayOrder: 6 },
      { value: 'Rawalpindi', label: 'Rawalpindi', displayOrder: 7 },
    ],
  },
  {
    fieldName: 'designation', fieldLabel: 'Designation', fieldType: 'Designation', displayOrder: 2,
    values: [
      { value: 'Food Inspector', label: 'Food Inspector', displayOrder: 1 },
      { value: 'Senior Inspector', label: 'Senior Inspector', displayOrder: 2 },
      { value: 'Supervisor', label: 'Supervisor', displayOrder: 3 },
      { value: 'Manager', label: 'Manager', displayOrder: 4 },
      { value: 'Admin', label: 'Admin', displayOrder: 5 },
      { value: 'Officer', label: 'Officer', displayOrder: 6 },
      { value: 'Director', label: 'Director', displayOrder: 7 },
    ],
  },
  {
    fieldName: 'serviceCadre', fieldLabel: 'Service Cadre', fieldType: 'ServiceCadre', displayOrder: 3,
    values: [
      { value: 'FPSC', label: 'FPSC', displayOrder: 1 },
      { value: 'Direct Recruitment', label: 'Direct Recruitment', displayOrder: 2 },
      { value: 'Contract', label: 'Contract', displayOrder: 3 },
      { value: 'Deputation', label: 'Deputation', displayOrder: 4 },
    ],
  },
  {
    fieldName: 'grade', fieldLabel: 'Grade / Level', fieldType: 'GradeLevel', displayOrder: 4,
    values: [
      { value: 'BPS-12', label: 'BPS-12', displayOrder: 1 },
      { value: 'BPS-14', label: 'BPS-14', displayOrder: 2 },
      { value: 'BPS-16', label: 'BPS-16', displayOrder: 3 },
      { value: 'BPS-17', label: 'BPS-17', displayOrder: 4 },
      { value: 'BPS-18', label: 'BPS-18', displayOrder: 5 },
      { value: 'BPS-19', label: 'BPS-19', displayOrder: 6 },
      { value: 'BPS-20', label: 'BPS-20', displayOrder: 7 },
    ],
  },
  {
    fieldName: 'shiftType', fieldLabel: 'Shift Type', fieldType: 'ShiftType', displayOrder: 5,
    values: [
      { value: 'Day', label: 'Day Shift', displayOrder: 1 },
      { value: 'Night', label: 'Night Shift', displayOrder: 2 },
      { value: 'Rotation', label: 'Rotation', displayOrder: 3 },
    ],
  },
  {
    fieldName: 'employmentStatus', fieldLabel: 'Employment Status', fieldType: 'EmploymentStatus', displayOrder: 6,
    values: [
      { value: 'Active', label: 'Active', displayOrder: 1 },
      { value: 'On Leave', label: 'On Leave', displayOrder: 2 },
      { value: 'Suspended', label: 'Suspended', displayOrder: 3 },
      { value: 'Retired', label: 'Retired', displayOrder: 4 },
    ],
  },
];

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    { email: 'admin@pfa.gov.pk', password: 'admin1234', name: 'PFA Admin', role: 'admin', code: 'ADM-001' },
    { email: 'super@pfa.gov.pk', password: 'super1234', name: 'Super Admin', role: 'super_admin', code: 'SA-001' },
  ];
  for (const s of users) {
    const existing = await prisma.employee.findUnique({ where: { email: s.email } });
    if (existing) {
      await prisma.employee.update({ where: { email: s.email }, data: { password: await hash(s.password), role: s.role, name: s.name } });
      console.log(`Updated: ${s.email} (${s.role})`);
    } else {
      await prisma.employee.create({ data: { email: s.email, password: await hash(s.password), name: s.name, role: s.role, employeeCode: s.code, active: true } });
      console.log(`Created: ${s.email} (${s.role})`);
    }
  }

  // ── Dropdowns ──────────────────────────────────────────────────────────────
  for (const dd of DROPDOWN_SEEDS) {
    let master = await prisma.dropdownMaster.findFirst({ where: { fieldType: dd.fieldType } });
    if (!master) {
      master = await prisma.dropdownMaster.create({
        data: { fieldName: dd.fieldName, fieldLabel: dd.fieldLabel, fieldType: dd.fieldType, displayOrder: dd.displayOrder },
      });
      console.log(`Created dropdown: ${dd.fieldLabel}`);
    }
    for (const v of dd.values) {
      const exists = await prisma.dropdownValue.findFirst({ where: { dropdownId: master.id, value: v.value } });
      if (!exists) {
        await prisma.dropdownValue.create({ data: { dropdownId: master.id, ...v } });
      }
    }
    console.log(`  ${dd.fieldLabel}: ${dd.values.length} values seeded`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
