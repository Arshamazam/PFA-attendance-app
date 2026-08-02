const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'faiq.gill@pfa.gov.pk',
  'uzma.shahzadi@pfa.gov.pk',
  'muhammad.zulqernain@pfa.gov.pk',
  'asim.shabir@pfa.gov.pk',
  'shahzad.anwer@pfa.gov.pk',
  'mehvish.ghazala@pfa.gov.pk',
  'muhammad.imlak@pfa.gov.pk',
  'muhammad.arshad3@pfa.gov.pk',
  'hafiz.raza@pfa.gov.pk',
  'imdad.hussain@pfa.gov.pk',
  'akhtar.ahmed@pfa.gov.pk',
  'usman.ghani2@pfa.gov.pk',
  'zulqarnain@pfa.gov.pk',
  'abdul.wahab2@pfa.gov.pk',
  'amir.raza@pfa.gov.pk',
  'muhammad.arshad4@pfa.gov.pk',
  'muhammad.waqas3@pfa.gov.pk',
  'shamsa.kanwal@pfa.gov.pk',
  'shehar.shafqat@pfa.gov.pk',
  'umar.farooq3@pfa.gov.pk',
  'zainab.batool@pfa.gov.pk',
  'abdul.rehman2@pfa.gov.pk',
  'ali.hassan3@pfa.gov.pk',
  'asif.ali3@pfa.gov.pk',
  'zain.touqeer@pfa.gov.pk',
  'jans@pfa.gov.pk',
  'mehboob.ali@pfa.gov.pk',
  'taimoor.awan@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Hafizabad' } },
  });
  if (!zone) { console.error('Hafizabad zone not found.'); process.exit(1); }
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
