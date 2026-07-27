/**
 * One-off script: add "44B operations Wing Muslim town Lahore" zone
 * to every employee who already has at least one zone assigned.
 * Employees with empty geofenceZoneIds are NOT touched.
 *
 * Run on the VPS:
 *   node /opt/pfa/backend/scripts/assign-44b-zone.js
 */

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const ZONE_NAME = '44B operations Wing Muslim town Lahore';
const ZONE_LAT  = 31.51500;
const ZONE_LNG  = 74.31404;

async function main() {
  // 1. Find or create the zone
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: '44B' } },
  });

  if (!zone) {
    console.log('Zone not found — creating it...');
    zone = await prisma.geofenceZone.create({
      data: {
        id: randomUUID(),
        name: ZONE_NAME,
        centerLat: ZONE_LAT,
        centerLng: ZONE_LNG,
        radiusMeters: 200,
        boundaryType: 'circle',
        enforcementLevel: 'strict',
        bufferZone: 30,
        gpsAccuracyThreshold: 50,
        gracePeriod: 5,
        active: true,
        updatedAt: new Date(),
      },
    });
    console.log(`Created zone: ${zone.id}`);
  } else {
    console.log(`Found zone: ${zone.id} — "${zone.name}"`);
  }

  const zoneId = zone.id;

  // 2. Fetch all employees who already have at least one zone
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, geofenceZoneIds: true },
  });

  let updated = 0;
  let skipped = 0;
  let alreadyHas = 0;

  for (const emp of employees) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];

    // Skip employees with no zones assigned
    if (ids.length === 0) {
      skipped++;
      continue;
    }

    // Skip if already has this zone
    if (ids.includes(zoneId)) {
      alreadyHas++;
      continue;
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [...ids, zoneId], updatedAt: new Date() },
    });

    updated++;
    if (updated % 50 === 0) console.log(`  Updated ${updated} employees...`);
  }

  console.log('\n=== Done ===');
  console.log(`Updated    : ${updated} employees (zone added)`);
  console.log(`Skipped    : ${skipped} employees (had no zones — untouched)`);
  console.log(`Already had: ${alreadyHas} employees (zone was already assigned)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
