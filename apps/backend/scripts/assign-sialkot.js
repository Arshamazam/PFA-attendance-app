const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'baqar.anwar@pfa.gov.pk',
  'atif.pervaiz@pfa.gov.pk',
  'hafiza.munir@pfa.gov.pk',
  'hafiz.kamran@pfa.gov.pk',
  'umer.chander@pfa.gov.pk',
  'palwasha.shafique@pfa.gov.pk',
  'karamat.ali@pfa.gov.pk',
  'shahid.mehmood@pfa.gov.pk',
  'falak.ahsan@pfa.gov.pk',
  'adil.john@pfa.gov.pk',
  'adil.pervaiz@pfa.gov.pk',
  'asad.ali3@pfa.gov.pk',
  'asim@pfa.gov.pk',
  'falak.shaer@pfa.gov.pk',
  'faizan.ahmad@pfa.gov.pk',
  'muhammad.ali6@pfa.gov.pk',
  'naeem.masih@pfa.gov.pk',
  'syed.shah3@pfa.gov.pk',
  'yasir.sadiq@pfa.gov.pk',
  'ayesha.irshad@pfa.gov.pk',
  'faiza.jamshed@pfa.gov.pk',
  'junaid.fakhar@pfa.gov.pk',
  'kiran.shahzadi@pfa.gov.pk',
  'muhammad.ibtasam@pfa.gov.pk',
  'muhammad.usman3@pfa.gov.pk',
  'samreen.younas@pfa.gov.pk',
  'sana.fatima2@pfa.gov.pk',
  'sidra.salim@pfa.gov.pk',
  'sohail.qaisar@pfa.gov.pk',
  'abrar.rana@pfa.gov.pk',
  'muhammad.hyat@pfa.gov.pk',
  'zeeshan.mubarik@pfa.gov.pk',
  'shahzaib.malik@pfa.gov.pk',
];

async function main() {
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Sialkot' } },
  });
  if (!zone) { console.error('Sialkot zone not found.'); process.exit(1); }

  // Update to Google Maps-verified coordinates
  zone = await prisma.geofenceZone.update({
    where: { id: zone.id },
    data: { centerLat: 32.498901, centerLng: 74.524384, radiusMeters: 200, active: true },
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
