/**
 * Assign Murree geofence zone to all 17 Murree district employees.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-murree-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MURREE_EMAILS = [
  'jehanzeb.khalid@pfa.gov.pk',
  'muhammad.yasin@pfa.gov.pk',
  'talha.zahid@pfa.gov.pk',
  'waqas.ahmad@pfa.gov.pk',
  'khalil.ahmed@pfa.gov.pk',
  'ahmed.nawaz@pfa.gov.pk',
  'amrozia.safeer@pfa.gov.pk',
  'bilal.sajjad@pfa.gov.pk',
  'muhammad.ahmad6@pfa.gov.pk',
  'nomeen.akhtar@pfa.gov.pk',
  'asad.mehmood@pfa.gov.pk',
  'nasir.shahzad@pfa.gov.pk',
  'muhammad.ahmad7@pfa.gov.pk',
  'tabassum.habib@pfa.gov.pk',
  'wajid.mughal@pfa.gov.pk',
  'waleed.abbas@pfa.gov.pk',
  'waleed.ahmad2@pfa.gov.pk',
];

async function main() {
  // Find or create the Murree zone with exact coordinates
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Murree' } },
  });

  if (zone) {
    zone = await prisma.geofenceZone.update({
      where: { id: zone.id },
      data: { centerLat: 33.89659, centerLng: 73.42495, radiusMeters: 200, active: true },
    });
    console.log(`Zone updated: ${zone.id} — "${zone.name}"`);
  } else {
    zone = await prisma.geofenceZone.create({
      data: { name: 'Punjab Food Authority, Murree', centerLat: 33.89659, centerLng: 73.42495, radiusMeters: 200, active: true },
    });
    console.log(`Zone created: ${zone.id} — "${zone.name}"`);
  }

  let updated = 0, alreadyHad = 0, notFound = 0;

  for (const email of MURREE_EMAILS) {
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
