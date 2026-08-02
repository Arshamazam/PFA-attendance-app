/**
 * Assign ONLY the Muzaffargarh zone to all 45 Muzaffargarh employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Muzaffargarh  30.069445, 71.205985
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-muzaffargarh.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'muhammad.shahzad8@pfa.gov.pk',
  'habib.rasheed@pfa.gov.pk',
  'rizwan.ahmed@pfa.gov.pk',
  'nasir.abbas@pfa.gov.pk',
  'talha.khan@pfa.gov.pk',
  'faran.shahbaz@pfa.gov.pk',
  'muhammad.manzoor2@pfa.gov.pk',
  'sadia.sarfraz@pfa.gov.pk',
  'sonia.tahir@pfa.gov.pk',
  'hijab.fatima@pfa.gov.pk',
  'muhammad.ashraf4@pfa.gov.pk',
  'muhammad.abdullah3@pfa.gov.pk',
  'syed.gilani2@pfa.gov.pk',
  'jafar.hussain@pfa.gov.pk',
  'aakash.goher@pfa.gov.pk',
  'fida.hussain@pfa.gov.pk',
  'muhammad.haider3@pfa.gov.pk',
  'waseem.abbas@pfa.gov.pk',
  'muhammad.faruqi@pfa.gov.pk',
  'muhammad.zubair2@pfa.gov.pk',
  'muhammad.raza6@pfa.gov.pk',
  'abid.shah@pfa.gov.pk',
  'fahim.yousaf@pfa.gov.pk',
  'muhammad.rehan@pfa.gov.pk',
  'muhammad.shabir@pfa.gov.pk',
  'safeer.abbas@pfa.gov.pk',
  'alisha.haleem@pfa.gov.pk',
  'arslan.bashir@pfa.gov.pk',
  'iqra.jamal@pfa.gov.pk',
  'muhammad.rasool@pfa.gov.pk',
  'muhammad.ali10@pfa.gov.pk',
  'shahzad.arshad@pfa.gov.pk',
  'sonia.ashiq@pfa.gov.pk',
  'muhammad.sufyan@pfa.gov.pk',
  'muhammad.rasheed3@pfa.gov.pk',
  'pervaiz.akhtar@pfa.gov.pk',
  'abdul.qadeer2@pfa.gov.pk',
  'aqib.hussain@pfa.gov.pk',
  'ghulam.asghar@pfa.gov.pk',
  'muhammad.amir2@pfa.gov.pk',
  'muhammad.imran8@pfa.gov.pk',
  'muhammad.fareed@pfa.gov.pk',
  'muhammad.magsi@pfa.gov.pk',
  'muhammad.rizwan3@pfa.gov.pk',
  'waseem.abbas2@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Muzaffargarh' } },
  });
  if (!zone) { console.error('Muzaffargarh zone not found.'); process.exit(1); }
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
