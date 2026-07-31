/**
 * One-time fix: assign the correct geofence zone to mehran.rasheed@pfa.gov.pk
 * and ensure their profile is active and not soft-deleted.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-mehran-geofence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'mehran.rasheed@pfa.gov.pk';

  // Find the employee (including soft-deleted)
  const emp = await prisma.employee.findFirst({ where: { email } });
  if (!emp) {
    console.log('Employee not found in DB at all. Check the email address.');
    return;
  }

  console.log(`Found employee: ${emp.name} (${emp.id})`);
  console.log(`  deletedAt       : ${emp.deletedAt ?? 'null (active)'}`);
  console.log(`  requiresGeofence: ${emp.requiresGeofence}`);
  console.log(`  geofenceZoneIds : ${JSON.stringify(emp.geofenceZoneIds)}`);

  // Find the 44B zone
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: '44B' }, active: true },
  });

  if (!zone) {
    console.log('\nCould not find 44B zone. Listing all active zones:');
    const zones = await prisma.geofenceZone.findMany({ where: { active: true }, select: { id: true, name: true } });
    zones.forEach(z => console.log(`  ${z.id} — ${z.name}`));
    return;
  }

  console.log(`\nAssigning zone: ${zone.name} (${zone.id})`);

  await prisma.employee.update({
    where: { id: emp.id },
    data: {
      deletedAt: null,       // restore if soft-deleted
      active: true,
      requiresGeofence: true,
      geofenceZoneIds: [zone.id],
    },
  });

  console.log('\nDone. Mehran Rasheed can now check in from the 44B zone.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
