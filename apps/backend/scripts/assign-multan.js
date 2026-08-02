/**
 * Assign ONLY the Multan zone to all 115 Multan employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Multan  30.269327, 71.4929002
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-multan.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'rameez.zafar@pfa.gov.pk',
  'aamir.iftikhar@pfa.gov.pk',
  'muhammad.hanif@pfa.gov.pk',
  'najja.tariq@pfa.gov.pk',
  'muhammad.hashmi@pfa.gov.pk',
  'muhammad.rafiq2@pfa.gov.pk',
  'hafiz.qaisar@pfa.gov.pk',
  'muhammad.kashif2@pfa.gov.pk',
  'haseeb.ahmad@pfa.gov.pk',
  'rabia.anwar@pfa.gov.pk',
  'zainab.aslam@pfa.gov.pk',
  'muhammad.ahmed4@pfa.gov.pk',
  'khalid.ishfaq@pfa.gov.pk',
  'komal.akhtar@pfa.gov.pk',
  'memoona.tanveer@pfa.gov.pk',
  'romaisa.malik@pfa.gov.pk',
  'rabia.mehboob@pfa.gov.pk',
  'hafiz.tanveer@pfa.gov.pk',
  'kashif.shahzad@pfa.gov.pk',
  'rukhshinda.jabin@pfa.gov.pk',
  'hassnain.farooq@pfa.gov.pk',
  'muhammad.javid@pfa.gov.pk',
  'hira.choudhary@pfa.gov.pk',
  'saadia@pfa.gov.pk',
  'fatima.filza@pfa.gov.pk',
  'hunaina.saleem@pfa.gov.pk',
  'sania.ilyas@pfa.gov.pk',
  'insha.ghafoor@pfa.gov.pk',
  'jawad.ali@pfa.gov.pk',
  'sahar.qundeel@pfa.gov.pk',
  'muhammad.zafar3@pfa.gov.pk',
  'rao.ali@pfa.gov.pk',
  'wajid.ali@pfa.gov.pk',
  'maria.kiran@pfa.gov.pk',
  'hassan.daud@pfa.gov.pk',
  'hafiz.rahman@pfa.gov.pk',
  'muhammad.irfan5@pfa.gov.pk',
  'muhammad.naeem6@pfa.gov.pk',
  'muhammad.hashim@pfa.gov.pk',
  'ansar.ameen@pfa.gov.pk',
  'farhan.bhatti@pfa.gov.pk',
  'hamid.mahmood@pfa.gov.pk',
  'ghulam.khan@pfa.gov.pk',
  'hamad.sajid@pfa.gov.pk',
  'junaid.nadeem@pfa.gov.pk',
  'shafiq.shafi@pfa.gov.pk',
  'obaid.rehman@pfa.gov.pk',
  'naveed.ahmed@pfa.gov.pk',
  'muhammad.rashid2@pfa.gov.pk',
  'abdul.latif@pfa.gov.pk',
  'ghulam.mustafa3@pfa.gov.pk',
  'muhammad.irfan6@pfa.gov.pk',
  'umair.ali@pfa.gov.pk',
  'sajjad.hussain2@pfa.gov.pk',
  'mureed.hussain@pfa.gov.pk',
  'saeed.ahmad3@pfa.gov.pk',
  'muhammad.malik@pfa.gov.pk',
  'salman.aslam@pfa.gov.pk',
  'abdul.mustafa@pfa.gov.pk',
  'tariq.hussain@pfa.gov.pk',
  'muhammad.hashmi2@pfa.gov.pk',
  'ghulam.abbas3@pfa.gov.pk',
  'muhammad.draz@pfa.gov.pk',
  'safia.rashid@pfa.gov.pk',
  'muhammad.yasin3@pfa.gov.pk',
  'shahzada.haider@pfa.gov.pk',
  'afrasiyab.khan@pfa.gov.pk',
  'aftab.sarwar@pfa.gov.pk',
  'ghulam.abbas4@pfa.gov.pk',
  'ghulam.fareed3@pfa.gov.pk',
  'hafiz.usman@pfa.gov.pk',
  'malik.ashraf@pfa.gov.pk',
  'muhamamd.mushtaq@pfa.gov.pk',
  'muhammad.asif8@pfa.gov.pk',
  'muhammad.shahzad9@pfa.gov.pk',
  'muhammad.asim2@pfa.gov.pk',
  'muhammad.awaiz@pfa.gov.pk',
  'muhammad.sajjad@pfa.gov.pk',
  'muhammad.shahbaz3@pfa.gov.pk',
  'muhammad.shahzad10@pfa.gov.pk',
  'muhammad.usman7@pfa.gov.pk',
  'niaz.ahmad@pfa.gov.pk',
  'noman.ullah@pfa.gov.pk',
  'ome.afzal@pfa.gov.pk',
  'osama.mazhar@pfa.gov.pk',
  'rabia.naz@pfa.gov.pk',
  'saad.khan@pfa.gov.pk',
  'sadia.mushtaq@pfa.gov.pk',
  'sana.maryum@pfa.gov.pk',
  'syed.haider2@pfa.gov.pk',
  'tahseen.awan@pfa.gov.pk',
  'usama.khan@pfa.gov.pk',
  'waqas.tanveer@pfa.gov.pk',
  'yasir.abbas@pfa.gov.pk',
  'muhammad.rafiq3@pfa.gov.pk',
  'abbas.asghar@pfa.gov.pk',
  'ateeq.rehman@pfa.gov.pk',
  'muhammad.ali12@pfa.gov.pk',
  'muhammad.iqbal9@pfa.gov.pk',
  'muhammad.nazar@pfa.gov.pk',
  'muhammad.muzamil@pfa.gov.pk',
  'muhammad.talha2@pfa.gov.pk',
  'raees.ahmad@pfa.gov.pk',
  'zaheer.abbas2@pfa.gov.pk',
  'dawood.ahmad@pfa.gov.pk',
  'fida.hussain2@pfa.gov.pk',
  'imran.rajwana@pfa.gov.pk',
  'jam.sher@pfa.gov.pk',
  'muhammad.asif9@pfa.gov.pk',
  'muhammad.saleem3@pfa.gov.pk',
  'muhammad.shahzaib@pfa.gov.pk',
  'muhammad.shoaib4@pfa.gov.pk',
  'muhammad.hashmi3@pfa.gov.pk',
  'muhammad.zulfiqar@pfa.gov.pk',
  'shahbaz.bahadar@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Multan' } },
  });
  if (!zone) { console.error('Multan zone not found.'); process.exit(1); }
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
