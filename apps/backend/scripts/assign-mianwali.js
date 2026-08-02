/**
 * Assign ONLY the Mianwali zone to all 26 Mianwali employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Mianwali  32.557806, 71.548512
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-mianwali.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'meiraj.shakir@pfa.gov.pk',
  'muhammad.zaman2@pfa.gov.pk',
  'fariha.farrukh@pfa.gov.pk',
  'faisal.khan@pfa.gov.pk',
  'muhammad.aqeel3@pfa.gov.pk',
  'hafiz.tahir@pfa.gov.pk',
  'abdul.bhutta@pfa.gov.pk',
  'aneela.shamshad@pfa.gov.pk',
  'aman.khan@pfa.gov.pk',
  'waqar.ahmad2@pfa.gov.pk',
  'arshad.mehmood@pfa.gov.pk',
  'muhammad.saleem2@pfa.gov.pk',
  'muhammad.shoaib@pfa.gov.pk',
  'rasheed.atif@pfa.gov.pk',
  'ameer.nawaz@pfa.gov.pk',
  'umaid.ali@pfa.gov.pk',
  'munir.ahmad@pfa.gov.pk',
  'hafiz.gul@pfa.gov.pk',
  'muhammad.aziz2@pfa.gov.pk',
  'muhammad.khan13@pfa.gov.pk',
  'muhammad.mehmood@pfa.gov.pk',
  'muhammad.waheed@pfa.gov.pk',
  'muhammad.raza5@pfa.gov.pk',
  'mukhtiar.ahmed@pfa.gov.pk',
  'nazir.muhammad@pfa.gov.pk',
  'sami.khan@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Mianwali' } },
  });
  if (!zone) { console.error('Mianwali zone not found.'); process.exit(1); }
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
