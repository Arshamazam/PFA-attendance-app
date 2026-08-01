/**
 * Creates/updates ALL PFA district geofence zones and assigns employees
 * to their zone based on the department field.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-all-district-geofences.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All PFA district offices with exact coordinates from the official document
const DISTRICTS = [
  { district: 'Kasur',         lat: 31.1188125,          lng: 74.4747031          },
  { district: 'Sheikhupura',   lat: 31.7142,             lng: 73.9781             },
  { district: 'Nankana',       lat: 31.4521068,          lng: 73.7193239,
    aliases: ['Nankana Sahib', 'Nankana sahib']                                    },
  { district: 'Faisalabad',    lat: 31.436675,           lng: 73.038304           },
  { district: 'Jhang',         lat: 31.2781912,          lng: 72.3244196          },
  { district: 'Chiniot',       lat: 31.7092374,          lng: 72.9913365          },
  { district: 'T.T.Singh',     lat: 30.992084,           lng: 72.47177,
    aliases: ['TT Singh', 'Toba Tek Singh']                                        },
  { district: 'Okara',         lat: 30.815658,           lng: 73.462041           },
  { district: 'Sahiwal',       lat: 30.687433,           lng: 73.08999            },
  { district: 'Pakpattan',     lat: 30.352065,           lng: 73.398282           },
  { district: 'Murree',        lat: 33.896589,           lng: 73.424948           },
  { district: 'Rawalpindi',    lat: 33.630342,           lng: 73.075363           },
  { district: 'Attock',        lat: 33.768503,           lng: 72.323753           },
  { district: 'Chakwal',       lat: 32.932945,           lng: 72.831506           },
  { district: 'Jhelum',        lat: 32.9810846,          lng: 73.6795883          },
  { district: 'Gujranwala',    lat: 32.162241,           lng: 74.189305           },
  { district: 'Gujrat',        lat: 32.588248,           lng: 74.057378           },
  { district: 'M.B.Din',       lat: 32.566209,           lng: 73.477966,
    aliases: ['Mandi Bahauddin', 'MB Din', 'MBDin']                               },
  { district: 'Hafizabad',     lat: 32.075113,           lng: 73.720599           },
  { district: 'Sialkot',       lat: 32.498886,           lng: 74.524377           },
  { district: 'Narowal',       lat: 32.091969,           lng: 74.87421            },
  { district: 'Bhakkar',       lat: 31.633392,           lng: 71.078939           },
  { district: 'Mianwali',      lat: 32.557806,           lng: 71.548512           },
  { district: 'Khushab',       lat: 32.2853113,          lng: 72.2719107          },
  { district: 'Sargodha',      lat: 32.069206,           lng: 72.704911           },
  { district: 'Bahawalnagar',  lat: 29.986156,           lng: 73.234674           },
  { district: 'Bahawalpur',    lat: 29.384852,           lng: 71.666933           },
  { district: 'Multan',        lat: 30.269327,           lng: 71.4929002          },
  { district: 'Lodhran',       lat: 29.5367,             lng: 71.6304             },
  { district: 'Khanewal',      lat: 30.318725,           lng: 71.932734           },
  { district: 'Vehari',        lat: 30.036847,           lng: 72.362302           },
  { district: 'R.Y.Khan',      lat: 28.420600,           lng: 70.327528,
    aliases: ['Rahim Yar Khan', 'RY Khan', 'Rahimyar Khan']                       },
  { district: 'D.G.Khan',      lat: 30.041441,           lng: 70.651476,
    aliases: ['Dera Ghazi Khan', 'DG Khan', 'DGKhan']                             },
  { district: 'Layyah',        lat: 30.964841,           lng: 70.956199           },
  { district: 'Muzaffargarh',  lat: 30.069445,           lng: 71.205985           },
  { district: 'Rajanpur',      lat: 29.1083,             lng: 70.332647           },
];

const RADIUS = 200; // metres — standard radius for all district offices

async function findOrUpsertZone(district) {
  // Search by district name OR any alias
  const searchTerms = [district.district, ...(district.aliases ?? [])];
  let zone = null;
  for (const term of searchTerms) {
    zone = await prisma.geofenceZone.findFirst({
      where: { name: { contains: term } },
    });
    if (zone) break;
  }

  const zoneName = `Punjab Food Authority, ${district.district}`;

  if (zone) {
    zone = await prisma.geofenceZone.update({
      where: { id: zone.id },
      data: { centerLat: district.lat, centerLng: district.lng, radiusMeters: RADIUS, active: true },
    });
    return { zone, created: false };
  } else {
    zone = await prisma.geofenceZone.create({
      data: { name: zoneName, centerLat: district.lat, centerLng: district.lng, radiusMeters: RADIUS, active: true },
    });
    return { zone, created: true };
  }
}

async function assignEmployees(district, zoneId) {
  const searchTerms = [district.district, ...(district.aliases ?? [])];

  // Build OR conditions for all name variants
  const orConditions = searchTerms.map(term => ({
    department: { contains: term },
  }));

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, OR: orConditions },
    select: { id: true, name: true, email: true, geofenceZoneIds: true },
  });

  let updated = 0, already = 0;
  for (const emp of employees) {
    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];
    if (ids.includes(zoneId)) { already++; continue; }
    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [...ids, zoneId], requiresGeofence: true, updatedAt: new Date() },
    });
    updated++;
  }
  return { total: employees.length, updated, already };
}

async function main() {
  console.log(`Processing ${DISTRICTS.length} districts...\n`);

  const noEmployees = [];

  for (const d of DISTRICTS) {
    const { zone, created } = await findOrUpsertZone(d);
    const { total, updated, already } = await assignEmployees(d, zone.id);

    const status = created ? 'CREATED' : 'UPDATED';
    const empSummary = total === 0
      ? '⚠ 0 employees found'
      : `${updated} assigned, ${already} already had it`;

    console.log(`[${status}] ${d.district.padEnd(14)} → ${zone.id.slice(0,8)} | ${empSummary}`);

    if (total === 0) noEmployees.push(d.district);
  }

  console.log('\n=== Done ===');
  if (noEmployees.length > 0) {
    console.log('\nDistricts with 0 employees matched by department field:');
    noEmployees.forEach(d => console.log(`  - ${d}`));
    console.log('\nFor these districts, provide employee email lists and run a targeted script.');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
