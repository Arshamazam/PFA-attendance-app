/**
 * QA: Verify every active employee has a geofence zone assigned.
 * Reports per-district coverage and lists any employees who would
 * still get the "No office zone" error.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/qa-geofence-check.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ── 1. Load all zones ──────────────────────────────────────────────────────
  const zones = await prisma.geofenceZone.findMany({
    where: { active: true },
    select: { id: true, name: true, centerLat: true, centerLng: true, radiusMeters: true },
  });
  console.log(`Active zones in DB: ${zones.length}\n`);

  // ── 2. Load all active employees ───────────────────────────────────────────
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, active: true },
    select: {
      id: true, name: true, email: true, department: true,
      requiresGeofence: true, geofenceZoneIds: true,
    },
  });
  console.log(`Active employees in DB: ${employees.length}\n`);

  // ── 3. Categorise ──────────────────────────────────────────────────────────
  const exempt   = [];   // requiresGeofence = false  → intentionally exempt
  const covered  = [];   // requiresGeofence = true + has ≥1 zone → OK
  const exposed  = [];   // requiresGeofence = true + no zone     → WILL FAIL

  for (const emp of employees) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    if (!emp.requiresGeofence) {
      exempt.push(emp);
    } else if (ids.length > 0) {
      covered.push(emp);
    } else {
      exposed.push(emp);
    }
  }

  // ── 4. Per-zone employee count ─────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log(' ZONE COVERAGE');
  console.log('═══════════════════════════════════════════════════════');

  const zoneMap = {};
  for (const z of zones) zoneMap[z.id] = { ...z, count: 0 };

  for (const emp of covered) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    for (const id of ids) {
      if (zoneMap[id]) zoneMap[id].count++;
    }
  }

  const sortedZones = Object.values(zoneMap).sort((a, b) => a.name.localeCompare(b.name));
  for (const z of sortedZones) {
    const status = z.count > 0 ? '✓' : '⚠';
    console.log(`  ${status} ${z.name.padEnd(45)} ${z.count} employees`);
  }

  // ── 5. Exposed employees (will get "No office zone" error) ─────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' EMPLOYEES WITH NO ZONE ASSIGNED (will fail check-in)');
  console.log('═══════════════════════════════════════════════════════');

  if (exposed.length === 0) {
    console.log('  ✓ NONE — all geofence-required employees have a zone assigned.');
  } else {
    for (const emp of exposed) {
      console.log(`  ✗ ${emp.name.padEnd(35)} ${emp.email}  dept: ${emp.department ?? '—'}`);
    }
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total active employees : ${employees.length}`);
  console.log(`  Zone assigned (OK)     : ${covered.length}`);
  console.log(`  Geofence exempt        : ${exempt.length}`);
  console.log(`  NO ZONE — will fail    : ${exposed.length}`);
  console.log(`  Active zones           : ${zones.length}`);

  if (exposed.length === 0) {
    console.log('\n  ✓ QA PASSED — all employees can mark attendance.');
  } else {
    console.log(`\n  ✗ QA FAILED — ${exposed.length} employee(s) need a zone assigned.`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
