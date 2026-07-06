import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'PFAStaff@2024!';

const contractualStaff = [
  {
    name: 'Dr. Muhammad Asim Ijaz Sidhu',
    email: 'asim.sidhu@pfa.gov.pk',
    mobilePhone: '03301423357',
    cnic: '33104-9022720-3',
    designation: 'DDO',
    addressDistrict: 'Faisalabad',
    dateOfJoining: new Date('2017-08-17'),
    role: 'admin',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Madeeha Sajjad',
    email: 'madeeha.sajjad@pfa.gov.pk',
    mobilePhone: '03346047068',
    cnic: '33104-9371893-0',
    designation: 'FSO',
    addressDistrict: 'Faisalabad',
    dateOfJoining: new Date('2017-02-03'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Hafiza Bushra Tariq',
    email: 'hafiza.tariq@pfa.gov.pk',
    mobilePhone: '03314073732',
    cnic: '35202-9991818-0',
    designation: 'AFSO',
    addressDistrict: 'Narowal',
    dateOfJoining: new Date('2017-12-28'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Madiha Komal',
    email: 'madiha.komal@pfa.gov.pk',
    mobilePhone: '03351839119',
    cnic: '34403-5105324-4',
    designation: 'AFSO',
    addressDistrict: 'M.B.Din',
    dateOfJoining: new Date('2017-12-30'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Akbar Sultan',
    email: 'akbar.sultan@pfa.gov.pk',
    mobilePhone: '03076008289',
    cnic: '38401-1858183-9',
    designation: 'AFSO',
    addressDistrict: 'Sargodha',
    dateOfJoining: new Date('2025-01-13'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Anam Harfi',
    email: 'anam.harfi@pfa.gov.pk',
    mobilePhone: '03190541454',
    cnic: '35202-0557785-6',
    designation: 'CO',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2014-06-02'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Nighat Latif',
    email: 'nighat.latif@pfa.gov.pk',
    mobilePhone: '03337967961',
    cnic: '35202-2833245-8',
    designation: 'CO',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2013-01-11'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Awais Akram',
    email: 'awais.akram@pfa.gov.pk',
    mobilePhone: '03244140207',
    cnic: '35201-6331903-3',
    designation: 'JCO',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2017-08-19'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Asif Ali',
    email: 'asif.ali@pfa.gov.pk',
    mobilePhone: '03224645748',
    cnic: '35202-9445513-5',
    designation: 'JCO',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2017-08-19'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Muhammad Husnain Muzafer',
    email: 'husnain.muzafer@pfa.gov.pk',
    mobilePhone: '03044899373',
    cnic: '35202-9344584-3',
    designation: 'JCO',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2018-02-13'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
  {
    name: 'Fahad Ghafoor',
    email: 'fahad.ghafoor@pfa.gov.pk',
    mobilePhone: '03044846440',
    cnic: '35102-5313729-7',
    designation: 'JCO',
    addressDistrict: 'Kasur',
    dateOfJoining: new Date('2018-02-16'),
    role: 'employee',
    employmentStatus: 'Contractual',
  },
];

const contingentStaff = [
  {
    name: 'Ali Raza',
    email: 'ali.raza@pfa.gov.pk',
    mobilePhone: '03014494775',
    cnic: '35301-8823110-9',
    designation: 'Admin Trainee (Skilled-JCO)',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2017-05-17'),
    role: 'employee',
    employmentStatus: 'Contingent',
  },
  {
    name: 'Muhammad Awais',
    email: 'awais.muhammad@pfa.gov.pk',
    mobilePhone: '03024231943',
    cnic: '35202-7153763-7',
    designation: 'Admin Trainee (Unskilled)',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2017-10-30'),
    role: 'employee',
    employmentStatus: 'Contingent',
  },
  {
    name: 'Sufyan Arif',
    email: 'sufyan.arif@pfa.gov.pk',
    mobilePhone: '03084524297',
    cnic: '35202-5122726-3',
    designation: 'Admin Trainee (Unskilled)',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2020-12-01'),
    role: 'employee',
    employmentStatus: 'Contingent',
  },
  {
    name: 'Anbreena',
    email: 'anbreena@pfa.gov.pk',
    mobilePhone: '03211140208',
    cnic: '33103-6078199-6',
    designation: 'Admin Trainee (Skilled-JCO)',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2024-08-23'),
    role: 'employee',
    employmentStatus: 'Contingent',
  },
  {
    name: 'Mehran Rasheed',
    email: 'mehran.rasheed@pfa.gov.pk',
    mobilePhone: '03054754081',
    cnic: '35102-7284879-5',
    designation: 'Admin Trainee (Skilled-JCO)',
    addressDistrict: 'Lahore',
    dateOfJoining: new Date('2025-12-29'),
    role: 'employee',
    employmentStatus: 'Contingent',
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const allStaff = [...contractualStaff, ...contingentStaff];

  let created = 0;
  let skipped = 0;

  for (const staff of allStaff) {
    const existing = await prisma.employee.findUnique({ where: { email: staff.email } });
    if (existing) {
      console.log(`  SKIP  ${staff.email} (already exists)`);
      skipped++;
      continue;
    }

    await prisma.employee.create({
      data: {
        name: staff.name,
        email: staff.email,
        password: hashedPassword,
        role: staff.role,
        mobilePhone: staff.mobilePhone,
        cnic: staff.cnic,
        designation: staff.designation,
        department: 'Disposal of ADG Ops',
        addressDistrict: staff.addressDistrict,
        dateOfJoining: staff.dateOfJoining,
        employmentStatus: staff.employmentStatus,
        active: true,
        requiresGeofence: false,
      },
    });
    console.log(`  OK    ${staff.name} <${staff.email}>`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
