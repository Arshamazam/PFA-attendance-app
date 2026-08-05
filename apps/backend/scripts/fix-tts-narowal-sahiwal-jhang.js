const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DISTRICTS = [
  {
    search: ['T.T', 'Toba'],
    dept: 'T.T.Singh',
    lat: 30.9923908,
    lng: 72.4720585,
    label: 'T.T.Singh',
  },
  {
    search: ['Narowal'],
    dept: 'Narowal',
    lat: 32.0919385,
    lng: 74.8742837,
    label: 'Narowal',
  },
  {
    search: ['Sahiwal'],
    dept: 'Sahiwal',
    lat: 30.687435,
    lng: 73.089989,
    label: 'Sahiwal',
  },
  {
    search: ['Jhang'],
    dept: 'Jhang',
    lat: 31.2780341,
    lng: 72.3244457,
    label: 'Jhang',
  },
];

async function main() {
  for (const district of DISTRICTS) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${district.label}`);
    console.log('═'.repeat(60));

    // Find zone by name
    let zone = null;
    for (const keyword of district.search) {
      zone = await prisma.geofenceZone.findFirst({
        where: { name: { contains: keyword } },
      });
      if (zone) break;
    }

    if (!zone) {
      // Create the zone
      zone = await prisma.geofenceZone.create({
        data: {
          name: `Punjab Food Authority, ${district.label}`,
          centerLat: district.lat,
          centerLng: district.lng,
          radiusMeters: 200,
          active: true,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✦ Zone CREATED: "${zone.name}"`);
    } else {
      // Update coordinates
      zone = await prisma.geofenceZone.update({
        where: { id: zone.id },
        data: {
          centerLat: district.lat,
          centerLng: district.lng,
          radiusMeters: 200,
          active: true,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✦ Zone UPDATED: "${zone.name}"`);
    }

    console.log(`    Coords: ${zone.centerLat}, ${zone.centerLng}  r=${zone.radiusMeters}m`);

    // Find all active employees in this department
    const employees = await prisma.employee.findMany({
      where: { department: district.dept, deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    if (employees.length === 0) {
      console.log(`  ⚠  No employees found with department="${district.dept}"`);
      continue;
    }

    let assigned = 0;
    for (const emp of employees) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { geofenceZoneIds: [zone.id], requiresGeofence: true },
      });
      console.log(`  ✓ ${emp.name} (${emp.email})`);
      assigned++;
    }

    console.log(`\n  Assigned: ${assigned}/${employees.length}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  All 4 districts fixed.');
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
