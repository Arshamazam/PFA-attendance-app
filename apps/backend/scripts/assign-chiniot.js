const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'atta.arif@pfa.gov.pk',
  'javed.iqbal@pfa.gov.pk',
  'fahad.ameen@pfa.gov.pk',
  'muhammad.shahzad4@pfa.gov.pk',
  'ali.shahzad@pfa.gov.pk',
  'hassan.ashraf2@pfa.gov.pk',
  'muhammad.zafar2@pfa.gov.pk',
  'muhammad.hussain@pfa.gov.pk',
  'sana.akram2@pfa.gov.pk',
  'tooba.naseem@pfa.gov.pk',
  'aqsa.zulfiqar@pfa.gov.pk',
  'muhammad.awais4@pfa.gov.pk',
  'muhammad.naveed@pfa.gov.pk',
  'rabi.hasan@pfa.gov.pk',
  'asghar.ali@pfa.gov.pk',
  'zawar.hussain2@pfa.gov.pk',
  'mumtaz.hussain@pfa.gov.pk',
  'atta.ullah@pfa.gov.pk',
  'abid.nawaz@pfa.gov.pk',
  'anees.abbas@pfa.gov.pk',
  'khalid.abbas@pfa.gov.pk',
  'bilal.amin@pfa.gov.pk',
  'faisal.ameer@pfa.gov.pk',
  'hafiz.hassan@pfa.gov.pk',
  'mudassar.hussain@pfa.gov.pk',
  'muhammad.imran3@pfa.gov.pk',
  'muhammad.kazam@pfa.gov.pk',
  'nasreen.akhtar2@pfa.gov.pk',
  'sidra.hashmi@pfa.gov.pk',
  'tanveer.mumtaz@pfa.gov.pk',
  'zain.abbas@pfa.gov.pk',
  'ali.raza8@pfa.gov.pk',
  'imran.haider@pfa.gov.pk',
  'mubashir.ali@pfa.gov.pk',
  'abdul.waheed2@pfa.gov.pk',
  'ahmad.yaar@pfa.gov.pk',
  'amjad.ali3@pfa.gov.pk',
  'azhar.ahmad@pfa.gov.pk',
  'hasnain.shabbir@pfa.gov.pk',
  'hassan.raza@pfa.gov.pk',
  'sarfraz.hussain@pfa.gov.pk',
  'shoukat.raza@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Chiniot' } },
  });
  if (!zone) { console.error('Chiniot zone not found.'); process.exit(1); }
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
