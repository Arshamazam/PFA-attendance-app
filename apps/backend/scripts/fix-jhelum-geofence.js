/**
 * Assign Jhelum geofence zone to all 39 Jhelum district employees.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-jhelum-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JHELUM_EMAILS = [
  'farhan.wasim@pfa.gov.pk',
  'muhammad.zahid2@pfa.gov.pk',
  'abdul.rehman3@pfa.gov.pk',
  'muhammad.yaseen3@pfa.gov.pk',
  'muhammad.raza4@pfa.gov.pk',
  'nabila.zafar@pfa.gov.pk',
  'aaqib.saleem@pfa.gov.pk',
  'saad.hanif@pfa.gov.pk',
  'waseem.ali@pfa.gov.pk',
  'raja.hamza@pfa.gov.pk',
  'aftab.ahmed@pfa.gov.pk',
  'asif.dad@pfa.gov.pk',
  'mirza.hussain@pfa.gov.pk',
  'rashid.mehmood@pfa.gov.pk',
  'rockas.zafar@pfa.gov.pk',
  'sidra.parveen@pfa.gov.pk',
  'tahir.muneeb@pfa.gov.pk',
  'touseef.iqbal@pfa.gov.pk',
  'waqar.ahmad@pfa.gov.pk',
  'zohaib.hassan@pfa.gov.pk',
  'alisha.habib@pfa.gov.pk',
  'bilal.rasool@pfa.gov.pk',
  'danish.rasool@pfa.gov.pk',
  'hafsa.ashraf@pfa.gov.pk',
  'mehak.javed@pfa.gov.pk',
  'muhammad.mahmood2@pfa.gov.pk',
  'naheed.akhtar@pfa.gov.pk',
  'rao.umair@pfa.gov.pk',
  'wajida.batool@pfa.gov.pk',
  'zaigham.abbas@pfa.gov.pk',
  'ammar.kaleem@pfa.gov.pk',
  'sohail.rehman@pfa.gov.pk',
  'syed.mehdi@pfa.gov.pk',
  'wasif.bukhari@pfa.gov.pk',
  'abdul.salam@pfa.gov.pk',
  'muhammad.kamran@pfa.gov.pk',
  'muhammad.usman5@pfa.gov.pk',
  'raheel.shahzad@pfa.gov.pk',
  'syed.kazmi@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Jhelum' } },
  });
  if (!zone) { console.error('Jhelum zone not found in DB.'); process.exit(1); }
  console.log(`Zone: ${zone.id} — "${zone.name}"`);

  let updated = 0, alreadyHad = 0, notFound = 0;

  for (const email of JHELUM_EMAILS) {
    const emp = await prisma.employee.findFirst({
      where: { email },
      select: { id: true, name: true, geofenceZoneIds: true },
    });
    if (!emp) { console.log(`  NOT FOUND: ${email}`); notFound++; continue; }

    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    if (ids.includes(zone.id)) { alreadyHad++; continue; }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [...ids, zone.id], requiresGeofence: true, updatedAt: new Date() },
    });
    console.log(`  ✓ ${emp.name}`);
    updated++;
  }

  console.log('\n=== Done ===');
  console.log(`Updated    : ${updated}`);
  console.log(`Already had: ${alreadyHad}`);
  console.log(`Not found  : ${notFound}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
