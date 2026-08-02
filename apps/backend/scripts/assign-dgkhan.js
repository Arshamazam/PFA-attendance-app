/**
 * Assign ONLY the D.G.Khan zone to all 27 D.G.Khan employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, D.G.Khan  30.041441, 70.651476
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-dgkhan.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'muhammad.younas2@pfa.gov.pk',
  'khalid.amin@pfa.gov.pk',
  'zeeshan.shah@pfa.gov.pk',
  'muhammad.rahman@pfa.gov.pk',
  'andleeb.zahra@pfa.gov.pk',
  'mehboob.hussain@pfa.gov.pk',
  'muhammad.atta@pfa.gov.pk',
  'muhammad.kaleem2@pfa.gov.pk',
  'nasir.imran@pfa.gov.pk',
  'muhammad.bilal4@pfa.gov.pk',
  'muhammad.yazdan@pfa.gov.pk',
  'mohsin.raza2@pfa.gov.pk',
  'shahzad.hussain@pfa.gov.pk',
  'muhammad.yar@pfa.gov.pk',
  'maiza.idrees@pfa.gov.pk',
  'nosheen.ramzan@pfa.gov.pk',
  'sara.saeed@pfa.gov.pk',
  'abdul.salam2@pfa.gov.pk',
  'muhammad.aziz3@pfa.gov.pk',
  'shafqat.ali@pfa.gov.pk',
  'ghulam.fareed2@pfa.gov.pk',
  'ghulam.yaseen@pfa.gov.pk',
  'muhammad.afzal6@pfa.gov.pk',
  'muhammad.ismail@pfa.gov.pk',
  'nabi.bakhsh@pfa.gov.pk',
  'muhammad.aman@pfa.gov.pk',
  'muhammad.akram5@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'D.G' } },
  });
  if (!zone) { console.error('D.G.Khan zone not found.'); process.exit(1); }
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
