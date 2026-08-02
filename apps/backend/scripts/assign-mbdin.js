/**
 * Assign ONLY the M.B.Din zone to all 26 M.B.Din employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, M.B.Din  32.566209, 73.477966
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-mbdin.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'kashaf.asghar@pfa.gov.pk',
  'muhammad.ahmad5@pfa.gov.pk',
  'hafiz.hassan2@pfa.gov.pk',
  'kiran.ain@pfa.gov.pk',
  'rabia.yasin@pfa.gov.pk',
  'dianat.ali@pfa.gov.pk',
  'faiz.nasir@pfa.gov.pk',
  'adil.khan@pfa.gov.pk',
  'humayun.rasheed@pfa.gov.pk',
  'ramsha.gul@pfa.gov.pk',
  'abd.rehman@pfa.gov.pk',
  'aqsa.bano@pfa.gov.pk',
  'asim.munir@pfa.gov.pk',
  'hafiz.raza2@pfa.gov.pk',
  'imran.hassan@pfa.gov.pk',
  'mahnoor.arshad@pfa.gov.pk',
  'muhammad.haider2@pfa.gov.pk',
  'muhammad.mehboob@pfa.gov.pk',
  'muhammad.waleed3@pfa.gov.pk',
  'hasan.nawaz@pfa.gov.pk',
  'muhammad.asif5@pfa.gov.pk',
  'mustafa.kamal@pfa.gov.pk',
  'shahbaz.ahmed@pfa.gov.pk',
  'shahid.mehmood2@pfa.gov.pk',
  'bilal.hassan@pfa.gov.pk',
  'muhammad.tanveer2@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'M.B' } },
  });
  if (!zone) { console.error('M.B.Din zone not found.'); process.exit(1); }
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
