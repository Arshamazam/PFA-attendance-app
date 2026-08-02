const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'rao.rehman@pfa.gov.pk',
  'waseem.sajjad@pfa.gov.pk',
  'waqas.sarwar@pfa.gov.pk',
  'usman.shafique@pfa.gov.pk',
  'qamar.ilyas@pfa.gov.pk',
  'muhammad.tahir@pfa.gov.pk',
  'ata.rehman@pfa.gov.pk',
  'muhammad.ahmed@pfa.gov.pk',
  'muhammad.ijaz@pfa.gov.pk',
  'muhammad.sajid3@pfa.gov.pk',
  'tamoor.khan@pfa.gov.pk',
  'kashif@pfa.gov.pk',
  'shahid.yaqoob@pfa.gov.pk',
  'waqas.amin@pfa.gov.pk',
  'ghulam.mustafa@pfa.gov.pk',
  'niaz.ali@pfa.gov.pk',
  'syed.abbas@pfa.gov.pk',
  'jamshad.ali@pfa.gov.pk',
  'muhammad.javed2@pfa.gov.pk',
  'khalid.hussain@pfa.gov.pk',
  'ghulam.mustafa2@pfa.gov.pk',
  'muhammad.afzaal2@pfa.gov.pk',
  'muhammad.haneef@pfa.gov.pk',
  'muhammad.naeem2@pfa.gov.pk',
  'muhammad.pervez@pfa.gov.pk',
  'muhammad.sajid4@pfa.gov.pk',
  'syed.sabir@pfa.gov.pk',
  'tabassum@pfa.gov.pk',
  'tariq.arif@pfa.gov.pk',
  'zaheer.ahmad@pfa.gov.pk',
  'ayesha@pfa.gov.pk',
  'afaaq.ahmad@pfa.gov.pk',
  'ali.ishtiaq@pfa.gov.pk',
  'ali.raza4@pfa.gov.pk',
  'ayesha.qayyum@pfa.gov.pk',
  'kashif.ali@pfa.gov.pk',
  'mian.hussain@pfa.gov.pk',
  'minahil@pfa.gov.pk',
  'mohsan.saleem@pfa.gov.pk',
  'muhammad.afzal@pfa.gov.pk',
  'muhammad.afzal2@pfa.gov.pk',
  'muhammad.hamid@pfa.gov.pk',
  'muhammad.shehroz@pfa.gov.pk',
  'muhammad.tufail@pfa.gov.pk',
  'raja.hussain@pfa.gov.pk',
  'rukhsana.arshad@pfa.gov.pk',
  'saiqa.ghous@pfa.gov.pk',
  'shahzad.kareem@pfa.gov.pk',
  'tayyaba.saif@pfa.gov.pk',
  'ghulam.ali@pfa.gov.pk',
  'muhammad.arif@pfa.gov.pk',
  'muhammad.khan6@pfa.gov.pk',
  'muhammad.siddique@pfa.gov.pk',
  'nasir.ali@pfa.gov.pk',
  'ali.haider2@pfa.gov.pk',
  'irfan.kamal@pfa.gov.pk',
  'muhammad.abid@pfa.gov.pk',
  'muhammad.husnain@pfa.gov.pk',
  'rana.ahmad2@pfa.gov.pk',
  'sohaib@pfa.gov.pk',
  'umar.farooq2@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Kasur' } },
  });
  if (!zone) { console.error('Kasur zone not found.'); process.exit(1); }
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
