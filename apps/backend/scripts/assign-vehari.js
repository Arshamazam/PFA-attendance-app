/**
 * Assign ONLY the Vehari zone to all 56 Vehari employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Vehari  30.036846891249034, 72.36230236846454
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-vehari.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'maha.saeed@pfa.gov.pk',
  'muhammad.zahid3@pfa.gov.pk',
  'muhammad.siddique4@pfa.gov.pk',
  'ahmad.riaz@pfa.gov.pk',
  'ahmad.raza2@pfa.gov.pk',
  'haris.ali@pfa.gov.pk',
  'sadia.sharif@pfa.gov.pk',
  'saadia.maryam@pfa.gov.pk',
  'sumera.imtiaz@pfa.gov.pk',
  'muhammad.rauf@pfa.gov.pk',
  'shabbar.raza@pfa.gov.pk',
  'adnan.nazeer@pfa.gov.pk',
  'muhammad.waqas6@pfa.gov.pk',
  'muhammad.mushtaq2@pfa.gov.pk',
  'noman.ijaz@pfa.gov.pk',
  'sajid.abbas3@pfa.gov.pk',
  'tabassum.hina@pfa.gov.pk',
  'muhammad.raza7@pfa.gov.pk',
  'muhmmad.irfan@pfa.gov.pk',
  'nasar.abbas@pfa.gov.pk',
  'syed.shah7@pfa.gov.pk',
  'abdul.rehman5@pfa.gov.pk',
  'abid.hussain2@pfa.gov.pk',
  'abrar.haider@pfa.gov.pk',
  'ali.ahmad4@pfa.gov.pk',
  'ali.hassan6@pfa.gov.pk',
  'amir.nazir@pfa.gov.pk',
  'asif.khan@pfa.gov.pk',
  'husnain.abdal@pfa.gov.pk',
  'muhammad.ali13@pfa.gov.pk',
  'muhammad.arslan2@pfa.gov.pk',
  'muhammad.arslan3@pfa.gov.pk',
  'muhammad.riaz2@pfa.gov.pk',
  'muhammad.saleem4@pfa.gov.pk',
  'muhammad.hasnain2@pfa.gov.pk',
  'muhammad.irfan7@pfa.gov.pk',
  'muhammad.ahmad10@pfa.gov.pk',
  'muhammad.hameed2@pfa.gov.pk',
  'muhammad.aslam3@pfa.gov.pk',
  'muneeb.hussain@pfa.gov.pk',
  'shahnila.nawaz@pfa.gov.pk',
  'tasawar.hussian@pfa.gov.pk',
  'muhammad.saleem5@pfa.gov.pk',
  'muhammad.shahzaib2@pfa.gov.pk',
  'saqib.muneer@pfa.gov.pk',
  'tanveer.ahmad@pfa.gov.pk',
  'abdul.ghaffar@pfa.gov.pk',
  'hamza.habib@pfa.gov.pk',
  'junaid.raza@pfa.gov.pk',
  'muhammad.ahmar@pfa.gov.pk',
  'muhammad.danish@pfa.gov.pk',
  'muhammad.ejaz@pfa.gov.pk',
  'muhammad.iqbal10@pfa.gov.pk',
  'muhammad.saleem6@pfa.gov.pk',
  'shahid.ishfaq@pfa.gov.pk',
  'zeeshan.ali2@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Vehari' } },
  });
  if (!zone) { console.error('Vehari zone not found.'); process.exit(1); }
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
