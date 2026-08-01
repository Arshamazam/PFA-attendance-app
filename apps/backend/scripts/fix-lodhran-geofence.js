/**
 * Assign Lodhran geofence zone to all 30 Lodhran district employees.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-lodhran-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LODHRAN_EMAILS = [
  'mubashar.abbas@pfa.gov.pk',
  'muhammad.saddique@pfa.gov.pk',
  'khalid.fayyaz@pfa.gov.pk',
  'zunaira.zulfiqar@pfa.gov.pk',
  'muhammad.waseem2@pfa.gov.pk',
  'hafiza.ghafoor@pfa.gov.pk',
  'ameer.khan@pfa.gov.pk',
  'muhammad.aslam4@pfa.gov.pk',
  'aqsa.ashfaq@pfa.gov.pk',
  'muhammad.khan17@pfa.gov.pk',
  'shehzad.aslam@pfa.gov.pk',
  'abdul.ghaffar2@pfa.gov.pk',
  'meraj.ahmad@pfa.gov.pk',
  'muhammad.abbas3@pfa.gov.pk',
  'muhammad.shahzad11@pfa.gov.pk',
  'ahsan.mehmood@pfa.gov.pk',
  'kashif.umair@pfa.gov.pk',
  'mumtaz.ahmad@pfa.gov.pk',
  'abdul.manan2@pfa.gov.pk',
  'faisal.shahzad2@pfa.gov.pk',
  'iqra.asif@pfa.gov.pk',
  'muhammad.kashif3@pfa.gov.pk',
  'muhammad.sabir2@pfa.gov.pk',
  'talha.ali@pfa.gov.pk',
  'asif.murtaza@pfa.gov.pk',
  'javed.chohan@pfa.gov.pk',
  'tariq.aziz@pfa.gov.pk',
  'ghulam.abbas5@pfa.gov.pk',
  'irfan.yousaf@pfa.gov.pk',
  'mazhar.shah@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Lodhran' } },
  });
  if (!zone) { console.error('Lodhran zone not found in DB.'); process.exit(1); }
  console.log(`Zone: ${zone.id} — "${zone.name}"`);

  let updated = 0, alreadyHad = 0, notFound = 0;

  for (const email of LODHRAN_EMAILS) {
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
