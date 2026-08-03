const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'ch.sharif@pfa.gov.pk',
  'umair.arshad@pfa.gov.pk',
  'fareeha.anwar@pfa.gov.pk',
  'robina.taj@pfa.gov.pk',
  'sadia.khalid@pfa.gov.pk',
  'madiha.akhtar@pfa.gov.pk',
  'rabia.kayani@pfa.gov.pk',
  'srosh.yousaf@pfa.gov.pk',
  'syeda.hassan@pfa.gov.pk',
  'afshan.javed@pfa.gov.pk',
  'ayesha.riaz2@pfa.gov.pk',
  'ahmad.awan@pfa.gov.pk',
  'hasan.muhammad@pfa.gov.pk',
  'saher.bano@pfa.gov.pk',
  'sadia.afzal@pfa.gov.pk',
  'alishpa.majeed@pfa.gov.pk',
  'fouzia.younis@pfa.gov.pk',
  'iqra.iqbal@pfa.gov.pk',
  'irum.ashraf@pfa.gov.pk',
  'kanwal.abid@pfa.gov.pk',
  'maria.imtiaz@pfa.gov.pk',
  'nabeela.zulfiqar@pfa.gov.pk',
  'yusra.kiran@pfa.gov.pk',
  'hafiz.habib@pfa.gov.pk',
  'muzammil.ali@pfa.gov.pk',
  'muhammad.naeem4@pfa.gov.pk',
  'muhammad.usman4@pfa.gov.pk',
  'waqar.ahmed@pfa.gov.pk',
  'muhammad.iqbal3@pfa.gov.pk',
  'zabeh.ullah@pfa.gov.pk',
  'adeel.arshad@pfa.gov.pk',
  'afsheen.wajahat@pfa.gov.pk',
  'muhammad.ahsan@pfa.gov.pk',
  'shehla.adnan@pfa.gov.pk',
  'nasir.ansari@pfa.gov.pk',
  'asghar.hussain@pfa.gov.pk',
  'samar.iqbal@pfa.gov.pk',
  'rabia.saleem@pfa.gov.pk',
  'abdullah.tanveer@pfa.gov.pk',
  'arslan.malik@pfa.gov.pk',
  'asma.shoukat@pfa.gov.pk',
  'mirza.baig2@pfa.gov.pk',
  'muhammad.danyal@pfa.gov.pk',
  'muhammad.tayyab@pfa.gov.pk',
  'muhammad.waleed4@pfa.gov.pk',
  'naima.razzaqi@pfa.gov.pk',
  'nalain.muhammad@pfa.gov.pk',
  'nimra.saddique@pfa.gov.pk',
  'paris.butt@pfa.gov.pk',
  'waqar.ali@pfa.gov.pk',
  'zainab.nadeem@pfa.gov.pk',
  'zeeshan.khan@pfa.gov.pk',
  'muhammad.nadeem3@pfa.gov.pk',
  'abdul.mujahid@pfa.gov.pk',
  'abdul.qadeer@pfa.gov.pk',
  'amir.iqbal@pfa.gov.pk',
  'ammad.aslam@pfa.gov.pk',
  'hammad.ali@pfa.gov.pk',
  'mubashar.iqbal@pfa.gov.pk',
  'mudassar.hussain2@pfa.gov.pk',
  'muhammad.arslan@pfa.gov.pk',
  'naeem.zafar@pfa.gov.pk',
  'saboor.satti@pfa.gov.pk',
  'zain.mir@pfa.gov.pk',
  'abdul.hanan2@pfa.gov.pk',
  'akhtar.masih@pfa.gov.pk',
  'amina@pfa.gov.pk',
  'ashiq.hussain2@pfa.gov.pk',
  'faizan.ali@pfa.gov.pk',
  'irfan.kayani@pfa.gov.pk',
  'muhammad.asif6@pfa.gov.pk',
  'muhammad.naseer@pfa.gov.pk',
  'parveen@pfa.gov.pk',
  'raja.irshad@pfa.gov.pk',
  'surayya.hameed@pfa.gov.pk',
  'syed.shabbir@pfa.gov.pk',
  'syed.hassan@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Rawalpindi' } },
  });
  if (!zone) { console.error('Rawalpindi zone not found.'); process.exit(1); }
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
