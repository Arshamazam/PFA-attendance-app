/**
 * Fix: Create Bahawalnagar geofence zone and assign it to all
 * Bahawalpur / Bahawalnagar district employees.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-bahawalpur-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ZONE = {
  name: 'Punjab Food Authority, Bahawalnagar',
  centerLat: 29.98616,
  centerLng: 73.23467,
  radiusMeters: 250,
};

async function main() {
  // ── 1. Create zone if missing ─────────────────────────────────────────────
  let zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Bahawalnagar' } },
  });

  if (zone) {
    console.log(`Zone already exists: ${zone.id} — "${zone.name}"`);
  } else {
    zone = await prisma.geofenceZone.create({
      data: {
        name: ZONE.name,
        centerLat: ZONE.centerLat,
        centerLng: ZONE.centerLng,
        radiusMeters: ZONE.radiusMeters,
        active: true,
      },
    });
    console.log(`Zone created: ${zone.id} — "${zone.name}"`);
  }

  const zoneId = zone.id;

  // ── 2. Find employees in Bahawalpur / Bahawalnagar district ──────────────
  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      OR: [
        { department: { contains: 'Bahawalpur', mode: 'insensitive' } },
        { department: { contains: 'Bahawalnagar', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, department: true, geofenceZoneIds: true },
  });

  console.log(`\nFound ${employees.length} employee(s) in Bahawalpur/Bahawalnagar district.`);

  if (employees.length === 0) {
    // Fallback: list all departments so the admin can see what names are used
    const depts = await prisma.employee.findMany({
      where: { deletedAt: null, department: { not: null } },
      distinct: ['department'],
      select: { department: true },
      orderBy: { department: 'asc' },
    });
    console.log('\nNo employees matched. Current departments in DB:');
    depts.forEach((d) => console.log(`  - ${d.department}`));
    return;
  }

  let updated = 0, alreadyHad = 0;

  for (const emp of employees) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];

    if (ids.includes(zoneId)) {
      console.log(`  SKIP (already has zone): ${emp.name} (${emp.email})`);
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

    console.log(`  ✓ ${emp.name} (${emp.email}) [${emp.department}]`);
    updated++;
  }

  console.log('\n=== Done ===');
  console.log(`Zone ID    : ${zoneId}`);
  console.log(`Updated    : ${updated}`);
  console.log(`Already had: ${alreadyHad}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
