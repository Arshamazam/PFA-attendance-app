/**
 * Creates a test employee account for QA / feature testing.
 * The account is geofence-EXEMPT so it works from any location.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/create-test-user.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email    = 'test@pfa.gov.pk';
  const password = 'Test@1234';
  const name     = 'Test User';

  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) {
    console.log(`\nTest user already exists:`);
    console.log(`  Email    : ${email}`);
    console.log(`  Password : ${password}`);
    console.log(`  ID       : ${existing.id}`);
    console.log(`  Geofence exempt: ${!existing.requiresGeofence}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'employee',
      department: 'QA & Testing',
      designation: 'Test Account',
      employmentStatus: 'Active',
      requiresGeofence: false,   // exempt — works from any location
      geofenceZoneIds: [],
    },
  });

  console.log('\n=== Test user created ===');
  console.log(`  Name     : ${employee.name}`);
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
  console.log(`  ID       : ${employee.id}`);
  console.log(`  Geofence : EXEMPT (can check in from anywhere)`);
  console.log('\nUse these credentials to log in on the mobile app.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
