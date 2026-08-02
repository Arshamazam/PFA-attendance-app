/**
 * Fix wrong coordinates for Bahawalnagar, Layyah, Rajanpur, Lodhran zones.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-zone-coordinates.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ZONE_FIXES = [
  { name: 'Bahawalnagar', lat: 29.98616, lng: 73.23467 },
  { name: 'Layyah',       lat: 30.96484, lng: 70.95620 },
  { name: 'Rajanpur',     lat: 29.10830, lng: 70.33265 },
  { name: 'Lodhran',      lat: 29.53670, lng: 71.63040 },
];

async function main() {
  for (const fix of ZONE_FIXES) {
    const zone = await prisma.geofenceZone.findFirst({
      where: { name: { contains: fix.name } },
    });

    if (!zone) {
      console.log(`  NOT FOUND: zone containing "${fix.name}"`);
      continue;
    }

    await prisma.geofenceZone.update({
      where: { id: zone.id },
      data: { centerLat: fix.lat, centerLng: fix.lng, radiusMeters: 200, active: true },
    });

    console.log(`  ✓ ${zone.name} → (${fix.lat}, ${fix.lng})`);
  }

  console.log('\nDone.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
