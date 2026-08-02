/**
 * Assign ONLY the Khushab zone to all 31 Khushab employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Khushab  32.2853113, 72.2719107
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-khushab.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'lala.rukh@pfa.gov.pk',
  'hafiz.nawaz@pfa.gov.pk',
  'muhammad.imtiaz2@pfa.gov.pk',
  'anjum.shehzad@pfa.gov.pk',
  'muhammad.jamil@pfa.gov.pk',
  'muhammad.majeed2@pfa.gov.pk',
  'arslan.ashraf@pfa.gov.pk',
  'muhammad.ramzan3@pfa.gov.pk',
  'haseeb.haroon@pfa.gov.pk',
  'hafsa.iftikhar@pfa.gov.pk',
  'muhammad.ali7@pfa.gov.pk',
  'sajid.iqbal@pfa.gov.pk',
  'muhammad.hussain2@pfa.gov.pk',
  'ameer.hamza3@pfa.gov.pk',
  'rana.arif@pfa.gov.pk',
  'nazir.ahmed@pfa.gov.pk',
  'zubair.ali@pfa.gov.pk',
  'asad.abbas@pfa.gov.pk',
  'faisal.shahzad@pfa.gov.pk',
  'muhammad.qasim2@pfa.gov.pk',
  'muhammad.shahid7@pfa.gov.pk',
  'nimra.ameer@pfa.gov.pk',
  'wajeeha.momal@pfa.gov.pk',
  'masood.iqbal@pfa.gov.pk',
  'qaisar.abbas@pfa.gov.pk',
  'aman.ullah@pfa.gov.pk',
  'muhammad.anjum@pfa.gov.pk',
  'muhammad.yasin2@pfa.gov.pk',
  'sajid.abbas2@pfa.gov.pk',
  'umar.farooq4@pfa.gov.pk',
  'zulfiqar.ali3@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Khushab' } },
  });
  if (!zone) { console.error('Khushab zone not found.'); process.exit(1); }
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
