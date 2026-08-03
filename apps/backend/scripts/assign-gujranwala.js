const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'khushi.muhammad@pfa.gov.pk',
  'ashiq.hussain@pfa.gov.pk',
  'muhammad.usman2@pfa.gov.pk',
  'muhammad.qasim@pfa.gov.pk',
  'asif.waheed@pfa.gov.pk',
  'sadaf.zulfiqar@pfa.gov.pk',
  'anum.rafique@pfa.gov.pk',
  'marwah.nazir@pfa.gov.pk',
  'saqbah.rana@pfa.gov.pk',
  'hussnain.rasul@pfa.gov.pk',
  'salman.butt@pfa.gov.pk',
  'najaf.ali2@pfa.gov.pk',
  'ayesha.riaz@pfa.gov.pk',
  'muhammad.awais5@pfa.gov.pk',
  'muhammad.waleed2@pfa.gov.pk',
  'muhammad.bilal2@pfa.gov.pk',
  'salman.qaiser@pfa.gov.pk',
  'ali.hassan2@pfa.gov.pk',
  'hamza.shafiq@pfa.gov.pk',
  'gulraiz.saleem@pfa.gov.pk',
  'iram.aslam@pfa.gov.pk',
  'shamshair.khalid@pfa.gov.pk',
  'zeeshan.aslam2@pfa.gov.pk',
  'usman.naeem@pfa.gov.pk',
  'adeel.ahmad3@pfa.gov.pk',
  'tariq.masih2@pfa.gov.pk',
  'zeeshan.haider3@pfa.gov.pk',
  'hafiz.hussain@pfa.gov.pk',
  'adeel.ahmad4@pfa.gov.pk',
  'ahmad.ibrahim@pfa.gov.pk',
  'asad.bashir@pfa.gov.pk',
  'ayesha.javeed@pfa.gov.pk',
  'haroon.rasheed@pfa.gov.pk',
  'moeez.iftikhar@pfa.gov.pk',
  'muhammad.khan8@pfa.gov.pk',
  'nafeesa.rani@pfa.gov.pk',
  'rimsha@pfa.gov.pk',
  'saad.ishaque@pfa.gov.pk',
  'samia2@pfa.gov.pk',
  'samreen.afshan@pfa.gov.pk',
  'sharmeen.sohail@pfa.gov.pk',
  'usama.saif@pfa.gov.pk',
  'aftab.ahmad@pfa.gov.pk',
  'asif.ali2@pfa.gov.pk',
  'hafiz.ali@pfa.gov.pk',
  'ibrar.ahmad@pfa.gov.pk',
  'irfan.danish@pfa.gov.pk',
  'khawar.masih@pfa.gov.pk',
  'muhammad.arfan@pfa.gov.pk',
  'muhammad.salal@pfa.gov.pk',
  'muhammad.umar3@pfa.gov.pk',
  'muhammad.afzal4@pfa.gov.pk',
  'shah.jahan@pfa.gov.pk',
  'shahid.farooq@pfa.gov.pk',
  'ahsan.shah@pfa.gov.pk',
  'chanda.jalal@pfa.gov.pk',
  'hansi.cronia@pfa.gov.pk',
  'mizla.tariq@pfa.gov.pk',
  'muhammad.shahzad5@pfa.gov.pk',
  'nadeem.masih@pfa.gov.pk',
  'rana.ali2@pfa.gov.pk',
  'syed.ahmad@pfa.gov.pk',
];

async function main() {
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Gujranwala' } },
  });
  if (!zone) { console.error('Gujranwala zone not found.'); process.exit(1); }

  // Update to Google Maps-verified coordinates (official PDF coords were ~850m off)
  zone = await prisma.geofenceZone.update({
    where: { id: zone.id },
    data: { centerLat: 32.169926, centerLng: 74.194939, radiusMeters: 200, active: true },
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
