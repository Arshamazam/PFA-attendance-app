const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'abdul.azeem@pfa.gov.pk',
  'muhammad.karim@pfa.gov.pk',
  'muhammad.kousar@pfa.gov.pk',
  'tahira.kalsoom@pfa.gov.pk',
  'ayesha.manzoor@pfa.gov.pk',
  'toheed.saadi@pfa.gov.pk',
  'muhammad.jaffar@pfa.gov.pk',
  'muqdas.jubbar@pfa.gov.pk',
  'muhammad.farooq7@pfa.gov.pk',
  'ahmad.raza3@pfa.gov.pk',
  'ahtasham.naseer@pfa.gov.pk',
  'kashif.ali2@pfa.gov.pk',
  'noman.khan@pfa.gov.pk',
  'muhammad.ahmad13@pfa.gov.pk',
  'muhammad.naeem7@pfa.gov.pk',
  'ejaz.ahmad2@pfa.gov.pk',
  'irfan.ullah@pfa.gov.pk',
  'muhammad.rafique4@pfa.gov.pk',
  'muhammad.rafique5@pfa.gov.pk',
  'hafiz.kamran2@pfa.gov.pk',
  'abid.ali2@pfa.gov.pk',
  'ali.raza13@pfa.gov.pk',
  'ali.amanat@pfa.gov.pk',
  'aliza.nawaz@pfa.gov.pk',
  'israr.babar@pfa.gov.pk',
  'mansab.ali@pfa.gov.pk',
  'muhammad.bilal6@pfa.gov.pk',
  'muhammad.ranjha@pfa.gov.pk',
  'muhammad.sabtain2@pfa.gov.pk',
  'muhammad.mukhtar@pfa.gov.pk',
  'muhammad.zahoor@pfa.gov.pk',
  'muhammad.saeed3@pfa.gov.pk',
  'nazish.afzal@pfa.gov.pk',
  'sanwal.khizar@pfa.gov.pk',
  'sharafat.ali2@pfa.gov.pk',
  'muhammad.talha3@pfa.gov.pk',
  'muhammad.saifi@pfa.gov.pk',
  'aqib.javed2@pfa.gov.pk',
  'ashfaq.ahmad@pfa.gov.pk',
  'guftar.khan@pfa.gov.pk',
  'muhammad.khan20@pfa.gov.pk',
  'nasir.ali2@pfa.gov.pk',
  'nasir.iqbal@pfa.gov.pk',
  'sabir.masih@pfa.gov.pk',
  'tariq.aziz2@pfa.gov.pk',
  'umer.daraz@pfa.gov.pk',
  'hafiz.bahadur@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Okara' } },
  });
  if (!zone) { console.error('Okara zone not found.'); process.exit(1); }
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
