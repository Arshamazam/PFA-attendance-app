/**
 * Assign ONLY the Bhakkar zone to all 47 Bhakkar employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Bhakkar  31.633392157159193, 71.07893908346402
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-bhakkar.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'raza.rehman@pfa.gov.pk',
  'ghazala.mehboob@pfa.gov.pk',
  'amir.khan@pfa.gov.pk',
  'fayyaz.javed@pfa.gov.pk',
  'muhammad.shafique@pfa.gov.pk',
  'laiba.asghar@pfa.gov.pk',
  'ghulam.jafir@pfa.gov.pk',
  'taoqeer.akhtar@pfa.gov.pk',
  'sundas.ijaz@pfa.gov.pk',
  'mohsin.attique@pfa.gov.pk',
  'farhat.sajjad@pfa.gov.pk',
  'ghulam.abbas2@pfa.gov.pk',
  'syed.imran@pfa.gov.pk',
  'mohsin.ali2@pfa.gov.pk',
  'muhammad.shah@pfa.gov.pk',
  'muhammad.khan12@pfa.gov.pk',
  'muhammad.ashraf3@pfa.gov.pk',
  'wasim.mushtaq@pfa.gov.pk',
  'zaheer.mushtaq@pfa.gov.pk',
  'mobshar.ali@pfa.gov.pk',
  'asghar.mehdi@pfa.gov.pk',
  'abdul.majeed2@pfa.gov.pk',
  'abdul.majeed3@pfa.gov.pk',
  'abdul.khan2@pfa.gov.pk',
  'alambardar.hussain@pfa.gov.pk',
  'farrah.naz@pfa.gov.pk',
  'imran.saleem@pfa.gov.pk',
  'muhammad.imran5@pfa.gov.pk',
  'muhammad.ramzan2@pfa.gov.pk',
  'muneer.ahmad@pfa.gov.pk',
  'saima.parveen@pfa.gov.pk',
  'sher.zaman@pfa.gov.pk',
  'sheraz.khan@pfa.gov.pk',
  'zaheer.abbas@pfa.gov.pk',
  'haroon.shahzad@pfa.gov.pk',
  'muhammad.imran6@pfa.gov.pk',
  'asghar.ali2@pfa.gov.pk',
  'hasnat.raza@pfa.gov.pk',
  'kehkashan.batool@pfa.gov.pk',
  'muhammad.irfan3@pfa.gov.pk',
  'muhammad.zia@pfa.gov.pk',
  'muzammil.nawaz@pfa.gov.pk',
  'shehroz.raza@pfa.gov.pk',
  'zainab.muzaffar@pfa.gov.pk',
  'ehsan.ullah2@pfa.gov.pk',
  'aamir.abbas@pfa.gov.pk',
  'niaz.hussain@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Bhakkar' } },
  });
  if (!zone) { console.error('Bhakkar zone not found.'); process.exit(1); }
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
