/**
 * Assign ONLY the Rajanpur zone to all 19 Rajanpur employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Rajanpur  29.1083, 70.332647
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-rajanpur.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'abdul.ghafoor2@pfa.gov.pk',
  'muhammad.farooq5@pfa.gov.pk',
  'muhammad.siddique3@pfa.gov.pk',
  'moawiz.rahman@pfa.gov.pk',
  'laraib.akhlaq@pfa.gov.pk',
  'aashiq.hussain@pfa.gov.pk',
  'asad.ullah@pfa.gov.pk',
  'fahad.hussain@pfa.gov.pk',
  'muhammad.fareed2@pfa.gov.pk',
  'muhammad.waqas5@pfa.gov.pk',
  'rabia.kashaf@pfa.gov.pk',
  'sohaib.sipra@pfa.gov.pk',
  'muhammad.abbas2@pfa.gov.pk',
  'muhammad.nawaz3@pfa.gov.pk',
  'muhammad.sarfraz2@pfa.gov.pk',
  'ahmad.ali@pfa.gov.pk',
  'arslan.wazeer@pfa.gov.pk',
  'muhammad.ameen@pfa.gov.pk',
  'zulfiqar.ali4@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Rajanpur' } },
  });
  if (!zone) { console.error('Rajanpur zone not found.'); process.exit(1); }
  console.log(`Zone: "${zone.name}"  (${zone.centerLat}, ${zone.centerLng})\n`);

  let assigned = 0, notFound = 0;

  for (const email of EMAILS) {
    const emp = await prisma.employee.findFirst({
      where: { email },
      select: { id: true, name: true, geofenceZoneIds: true },
    });
    if (!emp) { console.log(`  NOT FOUND: ${email}`); notFound++; continue; }

    // Replace all zone assignments with ONLY this zone
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
