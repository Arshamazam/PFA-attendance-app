/**
 * Update coordinates for all 36 PFA district geofence zones.
 * Safe to re-run — only updates coordinates, never touches employee assignments.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-zone-coordinates.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// name = substring to match zone name in DB, lat/lng = exact PFA office coordinates
const ZONE_FIXES = [
  { name: 'Kasur',          lat: 31.1188125,          lng: 74.4747031          },
  { name: 'Sheikhupura',    lat: 31.7142,              lng: 73.9781             },
  { name: 'Nankana',        lat: 31.4521068,           lng: 73.7193239          },
  { name: 'Faisalabad',     lat: 31.436675,            lng: 73.038304           },
  { name: 'Jhang',          lat: 31.2781912,           lng: 72.3244196          },
  { name: 'Chiniot',        lat: 31.7092374,           lng: 72.9913365          },
  { name: 'T.T',            lat: 30.992084,            lng: 72.47177            },
  { name: 'Okara',          lat: 30.815658,            lng: 73.462041           },
  { name: 'Sahiwal',        lat: 30.687433,            lng: 73.08999            },
  { name: 'Pakpattan',      lat: 30.352065,            lng: 73.398282           },
  { name: 'Murree',         lat: 33.896589,            lng: 73.424948           },
  { name: 'Rawalpindi',     lat: 33.630342,            lng: 73.075363           },
  { name: 'Attock',         lat: 33.768503,            lng: 72.323753           },
  { name: 'Chakwal',        lat: 32.932945,            lng: 72.831506           },
  { name: 'Jhelum',         lat: 32.9810846,           lng: 73.6795883          },
  { name: 'Gujranwala',     lat: 32.162241,            lng: 74.189305           },
  { name: 'Gujrat',         lat: 32.588248,            lng: 74.057378           },
  { name: 'M.B',            lat: 32.566209,            lng: 73.477966           },
  { name: 'Hafizabad',      lat: 32.075113,            lng: 73.720599           },
  { name: 'Sialkot',        lat: 32.498886,            lng: 74.524377           },
  { name: 'Narowal',        lat: 32.091969,            lng: 74.87421            },
  { name: 'Bhakkar',        lat: 31.633392,            lng: 71.078939           },
  { name: 'Mianwali',       lat: 32.557806,            lng: 71.548512           },
  { name: 'Khushab',        lat: 32.2853113,           lng: 72.2719107          },
  { name: 'Sargodha',       lat: 32.069206,            lng: 72.704911           },
  { name: 'Bahawalnagar',   lat: 29.986156,            lng: 73.234674           },
  { name: 'Bahawalpur',     lat: 29.384852,            lng: 71.666933           },
  { name: 'Multan',         lat: 30.269327,            lng: 71.4929002          },
  { name: 'Lodhran',        lat: 29.5367,              lng: 71.6304             },
  { name: 'Khanewal',       lat: 30.31872507098313,    lng: 71.93273400800301   },
  { name: 'Vehari',         lat: 30.036846891249034,   lng: 72.36230236846454   },
  { name: 'R.Y',            lat: 28.420599518461444,   lng: 70.32752819472876   },
  { name: 'D.G',            lat: 30.041441,            lng: 70.651476           },
  { name: 'Layyah',         lat: 30.9648405952783,     lng: 70.95619853704406   },
  { name: 'Muzaffargarh',   lat: 30.069445,            lng: 71.205985           },
  { name: 'Rajanpur',       lat: 29.1083,              lng: 70.332647           },
];

async function main() {
  let updated = 0, notFound = 0;

  for (const fix of ZONE_FIXES) {
    const zone = await prisma.geofenceZone.findFirst({
      where: { name: { contains: fix.name } },
    });

    if (!zone) {
      console.log(`  NOT FOUND: zone containing "${fix.name}"`);
      notFound++;
      continue;
    }

    await prisma.geofenceZone.update({
      where: { id: zone.id },
      data: { centerLat: fix.lat, centerLng: fix.lng, radiusMeters: 200, active: true },
    });

    console.log(`  ✓ ${zone.name} → (${fix.lat}, ${fix.lng})`);
    updated++;
  }

  console.log(`\nUpdated: ${updated}  Not found: ${notFound}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
