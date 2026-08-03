const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'sadia.riffat@pfa.gov.pk',
  'muhammad.rashid@pfa.gov.pk',
  'faisal.mahmood@pfa.gov.pk',
  'ahmad.rabbani@pfa.gov.pk',
  'ali.raza9@pfa.gov.pk',
  'ahmar.gulzar@pfa.gov.pk',
  'alina.ansar@pfa.gov.pk',
  'ameer.hamza2@pfa.gov.pk',
  'iqra.khan@pfa.gov.pk',
  'robab.shehzadi@pfa.gov.pk',
  'rohail.malik@pfa.gov.pk',
  'saad.ansar@pfa.gov.pk',
  'samar.javaid@pfa.gov.pk',
  'samran.arshad@pfa.gov.pk',
  'zeba.aamir@pfa.gov.pk',
  'zilly.noor@pfa.gov.pk',
  'attiq.rehman@pfa.gov.pk',
  'kabeer.hussain@pfa.gov.pk',
  'muhammad.imran4@pfa.gov.pk',
  'sabir.hussain@pfa.gov.pk',
  'shahid.asghar@pfa.gov.pk',
  'touqeer.abbas@pfa.gov.pk',
  'arslan.ilyas@pfa.gov.pk',
  'farrukh.liaqat@pfa.gov.pk',
  'hannan@pfa.gov.pk',
  'hassan.sajjad@pfa.gov.pk',
  'syed.raza@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Gujrat' } },
  });
  if (!zone) { console.error('Gujrat zone not found.'); process.exit(1); }
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
