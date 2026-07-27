/**
 * Cleanup: remove 44B zone from employees who belong to a specific district
 * office or the Head Office. Each employee should only have their own zone.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-zone-cleanup.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Load all zones
  const allZones = await prisma.geofenceZone.findMany({ select: { id: true, name: true } });

  const find = (keyword) => allZones.find(z => z.name.toLowerCase().includes(keyword.toLowerCase()));

  const zone44B         = find('44B');
  const zoneHeadOffice  = find('Head Office') || find('83-C') || find('Naqsha');
  const zoneFaisalabad  = find('Faisalabad');
  const zoneGujranwala  = find('Gujranwala');
  const zoneKasur       = find('Kasur');
  const zoneSheikhupura = find('Sheikhupura');
  const zoneNankana     = find('Nankana');
  const zoneGujrat      = find('Gujrat');
  const zoneTraining    = find('Training School') || find('Multan Road');

  console.log('Zones found:');
  [zone44B, zoneHeadOffice, zoneFaisalabad, zoneGujranwala, zoneKasur, zoneSheikhupura, zoneNankana, zoneGujrat, zoneTraining]
    .forEach(z => console.log(`  ${z ? '✓' : '✗'} ${z?.name ?? 'NOT FOUND'}`));

  if (!zone44B) { console.error('44B zone not found — aborting.'); process.exit(1); }

  const id44B = zone44B.id;

  // Zones whose employees should keep ONLY their own zone (44B removed)
  const districtZones = [
    zoneHeadOffice, zoneFaisalabad, zoneGujranwala, zoneKasur,
    zoneSheikhupura, zoneNankana, zoneGujrat, zoneTraining,
  ].filter(Boolean);

  let totalFixed = 0;

  for (const zone of districtZones) {
    // Find all employees who have this district zone AND also have 44B
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, geofenceZoneIds: true },
    });

    const toFix = employees.filter(e => {
      const ids = Array.isArray(e.geofenceZoneIds) ? e.geofenceZoneIds : [];
      return ids.includes(zone.id) && ids.includes(id44B);
    });

    console.log(`\n${zone.name}: ${toFix.length} employees to fix`);

    for (const emp of toFix) {
      const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
      // Remove 44B, keep only their own zone(s) (excluding 44B)
      const cleaned = ids.filter(id => id !== id44B);
      await prisma.employee.update({
        where: { id: emp.id },
        data: { geofenceZoneIds: cleaned, updatedAt: new Date() },
      });
      totalFixed++;
    }

    console.log(`  ✓ Fixed ${toFix.length} employees for ${zone.name.replace('Punjab Food Authority', '').replace('Head Office', 'Head Office').trim()}`);
  }

  console.log('\n=== Done ===');
  console.log(`Total employees fixed: ${totalFixed}`);
  console.log('44B zone was removed from all district/head-office employees.');
  console.log('Pure 44B employees are untouched.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
