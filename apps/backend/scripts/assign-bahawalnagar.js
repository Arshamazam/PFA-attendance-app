/**
 * Assign ONLY the Bahawalnagar zone to all 29 Bahawalnagar employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Bahawalnagar  29.986156, 73.234674
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-bahawalnagar.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'muhammad.adrees@pfa.gov.pk',
  'ali.ahmad3@pfa.gov.pk',
  'saher.fatima@pfa.gov.pk',
  'ali.hasan@pfa.gov.pk',
  'muhammad.ijaz3@pfa.gov.pk',
  'muhammad.safyan@pfa.gov.pk',
  'arsalan.anjum@pfa.gov.pk',
  'muhammad.ahmed2@pfa.gov.pk',
  'muhammad.bari@pfa.gov.pk',
  'muhammad.waqas4@pfa.gov.pk',
  'hafiz.saleem@pfa.gov.pk',
  'muhammad.saeed2@pfa.gov.pk',
  'muhammad.sabir@pfa.gov.pk',
  'muhammad.khan15@pfa.gov.pk',
  'ammar.mustafa@pfa.gov.pk',
  'asad.zulfiqar@pfa.gov.pk',
  'muhammad.akram4@pfa.gov.pk',
  'muhammad.nadeem4@pfa.gov.pk',
  'muhammad.sajid5@pfa.gov.pk',
  'salman.abdullah@pfa.gov.pk',
  'muhammad.iftikhar2@pfa.gov.pk',
  'muhammad.tayyar@pfa.gov.pk',
  'parvaiz.ali@pfa.gov.pk',
  'chand.raza@pfa.gov.pk',
  'kaleem.abid@pfa.gov.pk',
  'khurram.binyamin@pfa.gov.pk',
  'muhammad.ahmed3@pfa.gov.pk',
  'muhammad.hussain3@pfa.gov.pk',
  'sajid.chishti@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Bahawalnagar' } },
  });
  if (!zone) { console.error('Bahawalnagar zone not found.'); process.exit(1); }
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
