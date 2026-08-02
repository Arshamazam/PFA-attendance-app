/**
 * Assign ONLY the Layyah zone to all 31 Layyah employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Layyah  30.9648405952783, 70.95619853704406
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-layyah.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'waqar.hasan@pfa.gov.pk',
  'ali.nawaz2@pfa.gov.pk',
  'muhammad.sibtain@pfa.gov.pk',
  'rashid.ali@pfa.gov.pk',
  'sarah.khan@pfa.gov.pk',
  'usman.hasan@pfa.gov.pk',
  'iqra.shahid@pfa.gov.pk',
  'tayyab.raza@pfa.gov.pk',
  'abdul.rehman4@pfa.gov.pk',
  'muhammad.imran9@pfa.gov.pk',
  'rehman.mushtaq@pfa.gov.pk',
  'asif.raza@pfa.gov.pk',
  'muhammad.bilal5@pfa.gov.pk',
  'nadeem.hassan@pfa.gov.pk',
  'abdul.sattar@pfa.gov.pk',
  'faisal.pervaiz@pfa.gov.pk',
  'muhammad.khan16@pfa.gov.pk',
  'muhammad.imran10@pfa.gov.pk',
  'muhammad.irfan4@pfa.gov.pk',
  'zahoor.hussain@pfa.gov.pk',
  'saeed.ahmad2@pfa.gov.pk',
  'ansar.abbas@pfa.gov.pk',
  'hira.barkat@pfa.gov.pk',
  'muhammad.ali11@pfa.gov.pk',
  'muhammad.ashraf5@pfa.gov.pk',
  'muhammad.hissam@pfa.gov.pk',
  'muhammad.mushtaq@pfa.gov.pk',
  'sayeda.zainab@pfa.gov.pk',
  'zeeshan.qasim@pfa.gov.pk',
  'zubair.iqbal@pfa.gov.pk',
  'zubair.ullah@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Layyah' } },
  });
  if (!zone) { console.error('Layyah zone not found.'); process.exit(1); }
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
