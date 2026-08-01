/**
 * Fix: Create/update "Punjab Food Authority, Bahawalpur" geofence zone
 * and assign it to all 55 Bahawalpur district employees.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-bahawalpur-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ZONE_NAME = 'Punjab Food Authority, Bahawalpur';
const ZONE = {
  centerLat: 29.384852,
  centerLng: 71.666933,
  radiusMeters: 150,
};

const BAHAWALPUR_EMAILS = [
  'muhammad.asif7@pfa.gov.pk',
  'mariam.khan@pfa.gov.pk',
  'ahmad.zaman@pfa.gov.pk',
  'komal.feroz@pfa.gov.pk',
  'muhammad.shahzad7@pfa.gov.pk',
  'zeeshan.akram@pfa.gov.pk',
  'faria.khalid@pfa.gov.pk',
  'furqan.iqbal@pfa.gov.pk',
  'muhammad.imran7@pfa.gov.pk',
  'amara.shafqat@pfa.gov.pk',
  'syed.mustafa@pfa.gov.pk',
  'muhammad.usman6@pfa.gov.pk',
  'mubashra.safder@pfa.gov.pk',
  'mehwish.arshad@pfa.gov.pk',
  'ahmad.bilal@pfa.gov.pk',
  'muhammad.ali8@pfa.gov.pk',
  'muhammad.khan14@pfa.gov.pk',
  'ali.hassan5@pfa.gov.pk',
  'muhammad.naeem5@pfa.gov.pk',
  'muhammad.saqlain@pfa.gov.pk',
  'tahir.maqsood@pfa.gov.pk',
  'amir.aziz@pfa.gov.pk',
  'muhammad.bashir@pfa.gov.pk',
  'muhammad.iqbal7@pfa.gov.pk',
  'muhammad.abbasi@pfa.gov.pk',
  'muhammad.shafiq@pfa.gov.pk',
  'sajjad.majeed@pfa.gov.pk',
  'sammar.iqbal@pfa.gov.pk',
  'zahid.iqbal@pfa.gov.pk',
  'abdul.mustansar@pfa.gov.pk',
  'adeeba.nisar@pfa.gov.pk',
  'arooj.sultan@pfa.gov.pk',
  'bilal.zaheer@pfa.gov.pk',
  'esha.kanwal@pfa.gov.pk',
  'hafiz.ahmed@pfa.gov.pk',
  'junaid.yaqoob@pfa.gov.pk',
  'muhamamd.arshad@pfa.gov.pk',
  'muhammad.shafique2@pfa.gov.pk',
  'muhammad.ahsan2@pfa.gov.pk',
  'muhammad.abdullah2@pfa.gov.pk',
  'qamar.abbas@pfa.gov.pk',
  'syed.shah5@pfa.gov.pk',
  'syed.aftab@pfa.gov.pk',
  'syeda.zahid@pfa.gov.pk',
  'muhammad.ahmad9@pfa.gov.pk',
  'muhammad.zubair@pfa.gov.pk',
  'saeed.iqbal@pfa.gov.pk',
  'muhammad.ramzan4@pfa.gov.pk',
  'allah.bakhsh@pfa.gov.pk',
  'muhammad.iqbal8@pfa.gov.pk',
  'muhammad.javed4@pfa.gov.pk',
  'muhammad.shoaib2@pfa.gov.pk',
  'shahbaz.ali@pfa.gov.pk',
  'syed.shah6@pfa.gov.pk',
  'zahoor.ahmad@pfa.gov.pk',
];

async function main() {
  // ── 1. Find or create the Bahawalpur zone ────────────────────────────────
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: ZONE_NAME },
  });

  if (zone) {
    // Update coordinates and radius to match what's specified
    zone = await prisma.geofenceZone.update({
      where: { id: zone.id },
      data: {
        centerLat: ZONE.centerLat,
        centerLng: ZONE.centerLng,
        radiusMeters: ZONE.radiusMeters,
        active: true,
      },
    });
    console.log(`Zone updated: ${zone.id} — "${zone.name}" (r=${zone.radiusMeters}m)`);
  } else {
    zone = await prisma.geofenceZone.create({
      data: {
        name: ZONE_NAME,
        centerLat: ZONE.centerLat,
        centerLng: ZONE.centerLng,
        radiusMeters: ZONE.radiusMeters,
        active: true,
      },
    });
    console.log(`Zone created: ${zone.id} — "${zone.name}" (r=${zone.radiusMeters}m)`);
  }

  const zoneId = zone.id;

  // ── 2. Assign zone to each Bahawalpur employee ───────────────────────────
  console.log(`\nProcessing ${BAHAWALPUR_EMAILS.length} employees...\n`);

  let updated = 0, alreadyHad = 0, notFound = 0;

  for (const email of BAHAWALPUR_EMAILS) {
    const emp = await prisma.employee.findFirst({
      where: { email },
      select: { id: true, name: true, email: true, geofenceZoneIds: true, deletedAt: true },
    });

    if (!emp) {
      console.log(`  NOT FOUND: ${email}`);
      notFound++;
      continue;
    }

    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];

    if (ids.includes(zoneId)) {
      console.log(`  SKIP (already assigned): ${emp.name}`);
      alreadyHad++;
      continue;
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        geofenceZoneIds: [...ids, zoneId],
        requiresGeofence: true,
        updatedAt: new Date(),
      },
    });

    console.log(`  ✓ ${emp.name} (${email})`);
    updated++;
  }

  console.log('\n=== Summary ===');
  console.log(`Zone ID    : ${zoneId}`);
  console.log(`Updated    : ${updated}`);
  console.log(`Already had: ${alreadyHad}`);
  console.log(`Not found  : ${notFound}`);

  if (notFound > 0) {
    console.log('\nNOTE: Employees marked NOT FOUND do not have an account in the DB yet.');
    console.log('Create their accounts in the admin panel and re-run this script.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
