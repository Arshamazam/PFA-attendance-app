/**
 * Assign ONLY the R.Y.Khan zone to all 29 R.Y.Khan employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, R.Y.Khan  28.420599518461444, 70.32752819472876
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-rykhan.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'muhammad.ali9@pfa.gov.pk',
  'hamza.rasheed@pfa.gov.pk',
  'muhammad.rana@pfa.gov.pk',
  'hafiz.shafiq@pfa.gov.pk',
  'ali.khan@pfa.gov.pk',
  'muhammad.asim@pfa.gov.pk',
  'sara.awan@pfa.gov.pk',
  'muhammad.akhtar@pfa.gov.pk',
  'mohammad.hamza@pfa.gov.pk',
  'samrah.akram@pfa.gov.pk',
  'muhammad.shoaib3@pfa.gov.pk',
  'hasnain.siraj@pfa.gov.pk',
  'muhammad.majeed3@pfa.gov.pk',
  'muhammad.tahir2@pfa.gov.pk',
  'muhammad.yaqub@pfa.gov.pk',
  'farooq.ahmad@pfa.gov.pk',
  'muhammad.tabassum@pfa.gov.pk',
  'ayesha.majeed@pfa.gov.pk',
  'jameel.ahmad@pfa.gov.pk',
  'muhammad.akhtar2@pfa.gov.pk',
  'muhammad.yaseen4@pfa.gov.pk',
  'abdul.manan@pfa.gov.pk',
  'asmat.ullah@pfa.gov.pk',
  'sabir.hussain2@pfa.gov.pk',
  'kaleem.ullah2@pfa.gov.pk',
  'muhammad.hussain4@pfa.gov.pk',
  'naseem.abbas@pfa.gov.pk',
  'surriya.ishaq@pfa.gov.pk',
  'usman.ghani3@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'R.Y' } },
  });
  if (!zone) { console.error('R.Y.Khan zone not found.'); process.exit(1); }
  console.log(`Zone: "${zone.name}"  (${zone.centerLat}, ${zone.centerLng})\n`);

  let assigned = 0, notFound = 0;

  for (const email of EMAILS) {
    const emp = await prisma.employee.findFirst({
      where: { email },
      select: { id: true, name: true },
    });
    if (!emp) { console.log(`  NOT FOUND: ${email}`); notFound++; continue; }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [zone.id], requiresGeofence: true },
    });
    console.log(`  ✓ ${emp.name}`);
    assigned++;
  }

  console.log(`\nAssigned : ${assigned}`);
  console.log(`Not found: ${notFound}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
