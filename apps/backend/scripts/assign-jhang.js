const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'yasir.mushtaq@pfa.gov.pk',
  'muhammad.asif3@pfa.gov.pk',
  'suyriyya.rashid@pfa.gov.pk',
  'wasim.sultan@pfa.gov.pk',
  'maria.kanwal@pfa.gov.pk',
  'ahmad.raza@pfa.gov.pk',
  'muhammad.raza2@pfa.gov.pk',
  'ali.raza7@pfa.gov.pk',
  'muhammad.ikram@pfa.gov.pk',
  'munawwar.hussain@pfa.gov.pk',
  'muhammad.ali3@pfa.gov.pk',
  'haji.ehsan@pfa.gov.pk',
  'farukh.nawaz@pfa.gov.pk',
  'sobia.rehman@pfa.gov.pk',
  'khizar.hayat@pfa.gov.pk',
  'toqueer.hussain@pfa.gov.pk',
  'tabassum.aalia@pfa.gov.pk',
  'asim.shabbir@pfa.gov.pk',
  'babar.shafi@pfa.gov.pk',
  'qaiser.abbas@pfa.gov.pk',
  'muneeba.shaheen@pfa.gov.pk',
  'muhammad.hamad@pfa.gov.pk',
  'sami.ullah@pfa.gov.pk',
  'waseem.ejaz@pfa.gov.pk',
  'salamat.ali@pfa.gov.pk',
  'naseer.ahmad@pfa.gov.pk',
  'allah.ditta2@pfa.gov.pk',
  'mubashar.kareem@pfa.gov.pk',
  'muhammad.asif4@pfa.gov.pk',
  'muhammad.fazil@pfa.gov.pk',
  'iftikhar.ahmad@pfa.gov.pk',
  'muhammad.ishaq@pfa.gov.pk',
  'qaisar.mumtaz@pfa.gov.pk',
  'muhammad.khan7@pfa.gov.pk',
  'hammad.raza@pfa.gov.pk',
  'sadaqat.ali@pfa.gov.pk',
  'allah.ditta3@pfa.gov.pk',
  'sajid.abbas@pfa.gov.pk',
  'shoaib.muhammad@pfa.gov.pk',
  'ahmad.shahzaib@pfa.gov.pk',
  'ghulam.haider@pfa.gov.pk',
  'ilyas.abbas@pfa.gov.pk',
  'misbah.nawaz@pfa.gov.pk',
  'mishal.zahra@pfa.gov.pk',
  'shah.nawaz@pfa.gov.pk',
  'waqas.lodhi@pfa.gov.pk',
  'abubakar.saddiq@pfa.gov.pk',
  'asad.hayat@pfa.gov.pk',
  'abdul.razzaq@pfa.gov.pk',
  'adeel.ahmad2@pfa.gov.pk',
  'muhammad.ali4@pfa.gov.pk',
  'muhammad.nawaz@pfa.gov.pk',
  'muhammad.ijaz2@pfa.gov.pk',
  'muhammad.mumtaz@pfa.gov.pk',
  'muhammad.shahid4@pfa.gov.pk',
  'nasreen.akhtar@pfa.gov.pk',
  'shafqat.ullah@pfa.gov.pk',
  'umer.ali@pfa.gov.pk',
  'zeeshan.haider2@pfa.gov.pk',
];

async function main() {
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Jhang' } },
  });
  if (!zone) { console.error('Jhang zone not found.'); process.exit(1); }

  zone = await prisma.geofenceZone.update({
    where: { id: zone.id },
    data: { centerLat: 31.2781912, centerLng: 72.3244196, radiusMeters: 200, active: true },
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
