import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const zones = [
  {
    name: 'PFA Headquarters - Lahore',
    centerLat: 31.5497,
    centerLng: 74.3045,
    radiusMeters: 250,
  },
  {
    name: 'PFA Regional Office - Cantt',
    centerLat: 31.5582,
    centerLng: 74.2909,
    radiusMeters: 200,
  },
  {
    name: 'PFA Field Office - Gulberg',
    centerLat: 31.5570,
    centerLng: 74.3521,
    radiusMeters: 180,
  },
  {
    name: 'PFA Laboratory - G.T. Road',
    centerLat: 31.5147,
    centerLng: 74.3897,
    radiusMeters: 220,
  },
  {
    name: 'PFA Warehouse - Port Authority',
    centerLat: 31.4895,
    centerLng: 74.3276,
    radiusMeters: 300,
  },
  {
    name: 'PFA Sub-Office - Askari/DHA',
    centerLat: 31.5734,
    centerLng: 74.4132,
    radiusMeters: 200,
  },
  {
    name: 'PFA Extension Office - Model Town',
    centerLat: 31.5687,
    centerLng: 74.3397,
    radiusMeters: 180,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const zone of zones) {
    const existing = await prisma.geofenceZone.findFirst({ where: { name: zone.name } });
    if (existing) {
      console.log(`  SKIP  ${zone.name}`);
      skipped++;
      continue;
    }

    await prisma.geofenceZone.create({
      data: {
        name: zone.name,
        centerLat: zone.centerLat,
        centerLng: zone.centerLng,
        radiusMeters: zone.radiusMeters,
        boundaryType: 'circle',
        enforcementLevel: 'strict',
        bufferZone: 30,
        gpsAccuracyThreshold: 50,
        gracePeriod: 5,
        active: true,
      },
    });
    console.log(`  OK    ${zone.name} (r=${zone.radiusMeters}m)`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
