/**
 * Assign R.Y.Khan geofence zone to all 29 R.Y.Khan district employees.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-rykhan-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RYKHAN_EMAILS = [
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
    where: { name: { contains: 'R.Y.Khan' } },
  });
  if (!zone) { console.error('R.Y.Khan zone not found in DB.'); process.exit(1); }
  console.log(`Zone: ${zone.id} — "${zone.name}"`);

  let updated = 0, alreadyHad = 0, notFound = 0;

  for (const email of RYKHAN_EMAILS) {
    const emp = await prisma.employee.findFirst({
      where: { email },
      select: { id: true, name: true, geofenceZoneIds: true },
    });
    if (!emp) { console.log(`  NOT FOUND: ${email}`); notFound++; continue; }

    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    if (ids.includes(zone.id)) { alreadyHad++; continue; }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [...ids, zone.id], requiresGeofence: true, updatedAt: new Date() },
    });
    console.log(`  ✓ ${emp.name}`);
    updated++;
  }

  console.log('\n=== Done ===');
  console.log(`Updated    : ${updated}`);
  console.log(`Already had: ${alreadyHad}`);
  console.log(`Not found  : ${notFound}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
