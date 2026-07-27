/**
 * Reassign Head Office employees → 44B zone.
 * The 1589 Lahore (Head Office) employees should check in at
 * "44B operations Wing Muslim town Lahore", not the old Head Office zone.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/reassign-headoffice-to-44b.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allZones = await prisma.geofenceZone.findMany({ select: { id: true, name: true } });

  const zone44B        = allZones.find(z => z.name.includes('44B'));
  const zoneHeadOffice = allZones.find(z => z.name.includes('Head Office') || z.name.includes('83-C'));

  if (!zone44B)        { console.error('44B zone not found');        process.exit(1); }
  if (!zoneHeadOffice) { console.error('Head Office zone not found'); process.exit(1); }

  console.log(`44B zone       : ${zone44B.id} — "${zone44B.name}"`);
  console.log(`Head Office zone: ${zoneHeadOffice.id} — "${zoneHeadOffice.name}"`);

  // Find all employees who currently have Head Office zone
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, geofenceZoneIds: true },
  });

  const toReassign = employees.filter(e => {
    const ids = Array.isArray(e.geofenceZoneIds) ? e.geofenceZoneIds : [];
    return ids.includes(zoneHeadOffice.id);
  });

  console.log(`\nFound ${toReassign.length} employees with Head Office zone — reassigning to 44B...\n`);

  let count = 0;
  for (const emp of toReassign) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    // Remove Head Office, add 44B (only if not already there)
    const cleaned = ids.filter(id => id !== zoneHeadOffice.id);
    if (!cleaned.includes(zone44B.id)) cleaned.push(zone44B.id);

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: cleaned, updatedAt: new Date() },
    });
    count++;
    if (count % 100 === 0) console.log(`  Updated ${count}...`);
  }

  console.log('\n=== Done ===');
  console.log(`Reassigned: ${count} employees (Head Office → 44B)`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
