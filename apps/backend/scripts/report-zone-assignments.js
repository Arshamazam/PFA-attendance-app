/**
 * Report: for each zone, list all assigned employees.
 * Helps verify every employee is in the correct district zone.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/report-zone-assignments.js 2>&1 | tee /tmp/zone-report.txt
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const zones = await prisma.geofenceZone.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, active: true, requiresGeofence: true },
    select: { id: true, name: true, email: true, department: true, geofenceZoneIds: true },
  });

  // Build zone id → name map
  const zoneMap = {};
  for (const z of zones) zoneMap[z.id] = z.name;

  // Build zone id → employees map
  const zoneEmployees = {};
  for (const z of zones) zoneEmployees[z.id] = [];

  const multiZone = [];

  for (const emp of employees) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    if (ids.length > 1) multiZone.push({ ...emp, zoneNames: ids.map(id => zoneMap[id] ?? id) });
    for (const id of ids) {
      if (zoneEmployees[id]) zoneEmployees[id].push(emp);
    }
  }

  // Print per-zone
  for (const zone of zones) {
    const emps = zoneEmployees[zone.id];
    console.log(`\n${'═'.repeat(60)}`);
    console.log(` ${zone.name}  (${emps.length} employees)`);
    console.log('═'.repeat(60));
    if (emps.length === 0) {
      console.log('  (no employees assigned)');
    } else {
      for (const e of emps) {
        console.log(`  ${e.name.padEnd(35)} ${e.email}`);
      }
    }
  }

  // Flag employees with multiple zones
  if (multiZone.length > 0) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(` EMPLOYEES WITH MULTIPLE ZONES (${multiZone.length})`);
    console.log('═'.repeat(60));
    for (const e of multiZone) {
      console.log(`  ${e.name.padEnd(35)} ${e.email}`);
      console.log(`    → ${e.zoneNames.join(', ')}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(` SUMMARY`);
  console.log('═'.repeat(60));
  console.log(`  Active zones     : ${zones.length}`);
  console.log(`  Total employees  : ${employees.length}`);
  console.log(`  Multi-zone emps  : ${multiZone.length}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
