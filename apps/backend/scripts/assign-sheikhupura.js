const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'ghulam.sabir@pfa.gov.pk',
  'muhammad.ali2@pfa.gov.pk',
  'ehsan.ullah@pfa.gov.pk',
  'fatima.saeed@pfa.gov.pk',
  'nasir.maqsood@pfa.gov.pk',
  'wajeeha.anjum@pfa.gov.pk',
  'mohsin.waseem@pfa.gov.pk',
  'muhammad.akram2@pfa.gov.pk',
  'zain.fatima@pfa.gov.pk',
  'maryam.ijaz@pfa.gov.pk',
  'muhammad.afzal3@pfa.gov.pk',
  'muhammad.shakeel2@pfa.gov.pk',
  'muhammad.naeem3@pfa.gov.pk',
  'anam.yaqoob@pfa.gov.pk',
  'muhammad.dawood@pfa.gov.pk',
  'muhammad.hasnain@pfa.gov.pk',
  'muzammil.hussain@pfa.gov.pk',
  'zeeshan.haider@pfa.gov.pk',
  'hayder.ali@pfa.gov.pk',
  'zikran.habib@pfa.gov.pk',
  'muhammad.rizwan@pfa.gov.pk',
  'muhammad.anees@pfa.gov.pk',
  'muhammad.asif@pfa.gov.pk',
  'mohsin.iqbal@pfa.gov.pk',
  'babar@pfa.gov.pk',
  'babar.abdullah@pfa.gov.pk',
  'farah.walaiat@pfa.gov.pk',
  'hamza.ali@pfa.gov.pk',
  'hamza.amin@pfa.gov.pk',
  'hassan.zulifiqar@pfa.gov.pk',
  'khuzaima.marsad@pfa.gov.pk',
  'muhammad.arsalan@pfa.gov.pk',
  'sana.razzaq@pfa.gov.pk',
  'shehreen.fatima@pfa.gov.pk',
  'sheikh.bilal@pfa.gov.pk',
  'syed.naqvi@pfa.gov.pk',
  'tayyaba.razzaq@pfa.gov.pk',
  'waqas.abbas@pfa.gov.pk',
  'abdul.khan@pfa.gov.pk',
  'agha.tahir@pfa.gov.pk',
  'alam.bhatti@pfa.gov.pk',
  'amjad.ali2@pfa.gov.pk',
  'imtiaz.shahzad@pfa.gov.pk',
  'muhammad.shahzad3@pfa.gov.pk',
  'muhammad.tanveer@pfa.gov.pk',
  'nadeem.ashraf@pfa.gov.pk',
  'fiaz.riaz@pfa.gov.pk',
  'muhammad.faiz@pfa.gov.pk',
  'muhammad.jahanzaib@pfa.gov.pk',
  'muhammad.javed3@pfa.gov.pk',
  'muhammad.aslam2@pfa.gov.pk',
  'muhammad.sakhawat@pfa.gov.pk',
  'noshad.ahmad@pfa.gov.pk',
  'talha.maqsood@pfa.gov.pk',
];

async function main() {
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Sheikhupura' } },
  });
  if (!zone) { console.error('Sheikhupura zone not found.'); process.exit(1); }

  zone = await prisma.geofenceZone.update({
    where: { id: zone.id },
    data: { centerLat: 31.7167839, centerLng: 73.967412, radiusMeters: 200, active: true },
  });
  console.log(`Zone updated: "${zone.name}"  (${zone.centerLat}, ${zone.centerLng})\n`);

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
