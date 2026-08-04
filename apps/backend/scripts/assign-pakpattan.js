const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'muhammad.sattar@pfa.gov.pk',
  'muhammad.ahmad12@pfa.gov.pk',
  'mudassar.saeed@pfa.gov.pk',
  'urooj.fatima@pfa.gov.pk',
  'ayaz.musharaf@pfa.gov.pk',
  'atta.rehman@pfa.gov.pk',
  'usama.asif@pfa.gov.pk',
  'hafsa.muniba@pfa.gov.pk',
  'sheraz.bakhtiar@pfa.gov.pk',
  'muhammad.arif4@pfa.gov.pk',
  'ishrat.hanif@pfa.gov.pk',
  'muhammad.hussain6@pfa.gov.pk',
  'muhammad.imran12@pfa.gov.pk',
  'mubashir.sohail@pfa.gov.pk',
  'irfan.hussain@pfa.gov.pk',
  'asif.ullah@pfa.gov.pk',
  'arslan.ashraf2@pfa.gov.pk',
  'admair.hussain@pfa.gov.pk',
  'ali.afaq@pfa.gov.pk',
  'muhammad.junaid@pfa.gov.pk',
  'muhammad.rashid3@pfa.gov.pk',
  'muhammad.sultan2@pfa.gov.pk',
  'muhammad.zia2@pfa.gov.pk',
  'usama.ashraf@pfa.gov.pk',
  'zaib.nisa@pfa.gov.pk',
  'junaid.ahmed@pfa.gov.pk',
  'mubarak.khan@pfa.gov.pk',
  'muhammad.khan19@pfa.gov.pk',
  'muhammad.sabir3@pfa.gov.pk',
  'muhammad.younas3@pfa.gov.pk',
  'naeem.abbas@pfa.gov.pk',
  'abid.shabbir@pfa.gov.pk',
  'muzamil.hussain@pfa.gov.pk',
];

async function main() {
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Pakpattan' } },
  });
  if (!zone) { console.error('Pakpattan zone not found.'); process.exit(1); }

  zone = await prisma.geofenceZone.update({
    where: { id: zone.id },
    data: { centerLat: 30.352011, centerLng: 73.398323, radiusMeters: 200, active: true },
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
