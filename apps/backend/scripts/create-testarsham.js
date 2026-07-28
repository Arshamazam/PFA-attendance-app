/**
 * Creates (or resets) the testarsham QA account.
 * - Creates the user if missing
 * - Resets password to Test@1234 every run
 * - Deletes all existing attendance records so you start fresh
 * - Geofence-EXEMPT: works from any location
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/create-testarsham.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email    = 'testarsham@pfa.gov.pk';
  const password = 'Test@1234';
  const name     = 'Arsham Test';

  const hashed = await bcrypt.hash(password, 10);

  let employee = await prisma.employee.findUnique({ where: { email } });

  if (employee) {
    // Reset password and restore active state
    employee = await prisma.employee.update({
      where: { email },
      data: {
        password: hashed,
        employmentStatus: 'Active',
        deletedAt: null,
        active: true,
        requiresGeofence: false,
        geofenceZoneIds: [],
      },
    });
    console.log('\n=== testarsham account reset ===');
  } else {
    employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'employee',
        department: 'QA & Testing',
        designation: 'Test Account',
        employmentStatus: 'Active',
        requiresGeofence: false,
        geofenceZoneIds: [],
      },
    });
    console.log('\n=== testarsham account created ===');
  }

  // Wipe all attendance records so you can test check-in from scratch
  const deleted = await prisma.attendance.deleteMany({
    where: { employeeId: employee.id },
  });

  console.log(`  Name       : ${employee.name}`);
  console.log(`  Email      : ${email}`);
  console.log(`  Password   : ${password}`);
  console.log(`  ID         : ${employee.id}`);
  console.log(`  Geofence   : EXEMPT (works from any location)`);
  console.log(`  Attendance : ${deleted.count} record(s) cleared`);
  console.log('\nReady — log in with the credentials above.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
