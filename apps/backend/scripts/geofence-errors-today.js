const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Today's window in PKT (UTC+5)
  const PKT = 5 * 60 * 60 * 1000;
  const nowPkt = new Date(Date.now() + PKT);
  const todayStr = nowPkt.toISOString().split('T')[0];
  const [y, m, d] = todayStr.split('-').map(Number);
  const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - PKT); // midnight PKT → UTC
  const endUtc   = new Date(startUtc.getTime() + 86_400_000);

  console.log(`\nDate (PKT): ${todayStr}`);
  console.log(`UTC window: ${startUtc.toISOString()} → ${endUtc.toISOString()}\n`);

  // 1. All employees with geofence required + zone assigned
  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      active: true,
      requiresGeofence: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      geofenceZoneIds: true,
    },
    orderBy: { department: 'asc' },
  });

  // Separate: geofence required but NO zone assigned
  const noZone = employees.filter(e => {
    const ids = e.geofenceZoneIds;
    return !ids || (Array.isArray(ids) && ids.length === 0);
  });

  const withZone = employees.filter(e => {
    const ids = e.geofenceZoneIds;
    return Array.isArray(ids) && ids.length > 0;
  });

  // 2. Who checked in today?
  const checkedIn = await prisma.attendance.findMany({
    where: { checkInTime: { gte: startUtc, lt: endUtc } },
    select: { employeeId: true },
  });
  const checkedInIds = new Set(checkedIn.map(r => r.employeeId));

  // 3. Employees with zone assigned but NOT checked in today
  const notCheckedIn = withZone.filter(e => !checkedInIds.has(e.id));

  // 4. Fetch zone details for display
  const allZoneIds = [...new Set(notCheckedIn.flatMap(e => e.geofenceZoneIds))];
  const zones = await prisma.geofenceZone.findMany({
    where: { id: { in: allZoneIds } },
    select: { id: true, name: true, centerLat: true, centerLng: true, radiusMeters: true, active: true },
  });
  const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]));

  console.log('═'.repeat(70));
  console.log(`  EMPLOYEES WITH GEOFENCE ZONE → NOT CHECKED IN TODAY`);
  console.log(`  (likely facing geofence errors or absent)`);
  console.log('═'.repeat(70));

  if (notCheckedIn.length === 0) {
    console.log('\n  ✓ All geofence employees have checked in today!\n');
  } else {
    let lastDept = '';
    for (const emp of notCheckedIn) {
      if (emp.department !== lastDept) {
        console.log(`\n  ── ${emp.department || 'Unknown District'} ──`);
        lastDept = emp.department;
      }
      const zoneId = emp.geofenceZoneIds[0];
      const zone = zoneMap[zoneId];
      const zoneInfo = zone
        ? `${zone.name} (${zone.centerLat}, ${zone.centerLng}) r=${zone.radiusMeters}m${zone.active ? '' : ' ⚠ INACTIVE'}`
        : `Zone ID: ${zoneId} (not found!)`;
      console.log(`  ✗ ${emp.name}`);
      console.log(`    ${emp.email}`);
      console.log(`    Zone: ${zoneInfo}`);
    }
    console.log('');
  }

  console.log('─'.repeat(70));
  console.log(`  Total geofence employees:        ${withZone.length}`);
  console.log(`  Checked in today:                ${withZone.length - notCheckedIn.length}`);
  console.log(`  NOT checked in (possible errors): ${notCheckedIn.length}`);

  if (noZone.length > 0) {
    console.log(`\n  ⚠  ${noZone.length} employee(s) have requiresGeofence=true but NO zone assigned:`);
    for (const e of noZone) {
      console.log(`     - ${e.name} (${e.email}) [${e.department}]`);
    }
  }

  console.log('─'.repeat(70));
  console.log('');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
