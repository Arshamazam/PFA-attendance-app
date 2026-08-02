/**
 * Assign ONLY the Khanewal zone to all 54 Khanewal employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Khanewal  30.31872507098313, 71.93273400800301
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-khanewal.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'tahir.saeed@pfa.gov.pk',
  'nadeem.amin@pfa.gov.pk',
  'shafqat.hussain@pfa.gov.pk',
  'muhammad.idrees@pfa.gov.pk',
  'anam.abbas@pfa.gov.pk',
  'iqra.dilshad@pfa.gov.pk',
  'hafiz.jamshaid@pfa.gov.pk',
  'muhammad.shah2@pfa.gov.pk',
  'namish.saleem@pfa.gov.pk',
  'abdul.shakir@pfa.gov.pk',
  'asad.ullah2@pfa.gov.pk',
  'muhammad.imran11@pfa.gov.pk',
  'hasnain.tassawar@pfa.gov.pk',
  'muhammad.umer2@pfa.gov.pk',
  'rabia.basri@pfa.gov.pk',
  'zeeshan.akram2@pfa.gov.pk',
  'zia.rehman@pfa.gov.pk',
  'mohsin.tufail@pfa.gov.pk',
  'muhammad.kanwal@pfa.gov.pk',
  'mazhar.hussain@pfa.gov.pk',
  'muhammad.iqbal11@pfa.gov.pk',
  'muhammad.shahid8@pfa.gov.pk',
  'shahid.hameed@pfa.gov.pk',
  'rashid.kabir@pfa.gov.pk',
  'muhammad.adnan2@pfa.gov.pk',
  'muhammad.saleem7@pfa.gov.pk',
  'muhammad.ramzan5@pfa.gov.pk',
  'shoaib.muhammad2@pfa.gov.pk',
  'khadija.mushtaq@pfa.gov.pk',
  'memmoona.ibrahim@pfa.gov.pk',
  'rida.fatima2@pfa.gov.pk',
  'tahir.khan@pfa.gov.pk',
  'ali.raza12@pfa.gov.pk',
  'asjad.anwar@pfa.gov.pk',
  'jamshid.iqbal@pfa.gov.pk',
  'khurram.shehbaz@pfa.gov.pk',
  'mubashar.ali@pfa.gov.pk',
  'muhammad.rizwan4@pfa.gov.pk',
  'muhammad.shair@pfa.gov.pk',
  'muhammad.rizwan5@pfa.gov.pk',
  'shabila.anjum@pfa.gov.pk',
  'sumair.hassan@pfa.gov.pk',
  'syed.raza2@pfa.gov.pk',
  'waqas.aslam@pfa.gov.pk',
  'muhammad.shakeel3@pfa.gov.pk',
  'adnan.zafar@pfa.gov.pk',
  'alam.zaib@pfa.gov.pk',
  'arshad.ashraf@pfa.gov.pk',
  'faheem.shahbaz@pfa.gov.pk',
  'faisal.hayyat@pfa.gov.pk',
  'hasnain.ali@pfa.gov.pk',
  'jawar.hussain@pfa.gov.pk',
  'mudassir.rehman@pfa.gov.pk',
  'muhammad.farooq6@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Khanewal' } },
  });
  if (!zone) { console.error('Khanewal zone not found.'); process.exit(1); }
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
