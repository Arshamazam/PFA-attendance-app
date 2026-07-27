/**
 * One-off: assign Punjab Food Authority Nankana Sahib zone
 * to the 47 Nankana employees listed in Nankana.pdf
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-nankana-zone.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NANKANA_EMAILS = [
  'adeel.ahmad@pfa.gov.pk',
  'asad.ali2@pfa.gov.pk',
  'muhammad.imtiaz@pfa.gov.pk',
  'khuram.shehzad@pfa.gov.pk',
  'aliza.zulfiqar@pfa.gov.pk',
  'aiman.athar@pfa.gov.pk',
  'habiba.zia@pfa.gov.pk',
  'muhammad.zeshan@pfa.gov.pk',
  'muhammad.sarwar@pfa.gov.pk',
  'muhammad.azeem2@pfa.gov.pk',
  'muhammad.arif2@pfa.gov.pk',
  'adnan.yasin@pfa.gov.pk',
  'muhammad.mansha@pfa.gov.pk',
  'muhammad.shahzad2@pfa.gov.pk',
  'muhammad.nadeem@pfa.gov.pk',
  'wasim.abbas@pfa.gov.pk',
  'shaheen.aslam@pfa.gov.pk',
  'muhammad.riaz@pfa.gov.pk',
  'syed.abbas2@pfa.gov.pk',
  'ghulam.dastgeer@pfa.gov.pk',
  'salamat.zia@pfa.gov.pk',
  'shahzad.nasir@pfa.gov.pk',
  'muhammad.imran2@pfa.gov.pk',
  'ali.babar@pfa.gov.pk',
  'amjad.ali@pfa.gov.pk',
  'aqib.javed@pfa.gov.pk',
  'arslan.haider@pfa.gov.pk',
  'asad.akbar@pfa.gov.pk',
  'moeed.akhtar@pfa.gov.pk',
  'moiz.qamar@pfa.gov.pk',
  'muhammad.siddique2@pfa.gov.pk',
  'muhammad.ayoub@pfa.gov.pk',
  'muhammad.majeed@pfa.gov.pk',
  'qasim.ali@pfa.gov.pk',
  'sana@pfa.gov.pk',
  'ali.nawaz@pfa.gov.pk',
  'ali.azhar@pfa.gov.pk',
  'khalid.khan@pfa.gov.pk',
  'shahjahan@pfa.gov.pk',
  'imran.ali@pfa.gov.pk',
  'abubakar.intazar@pfa.gov.pk',
  'ali.haider3@pfa.gov.pk',
  'babar.ali@pfa.gov.pk',
  'gul.zaman@pfa.gov.pk',
  'istikhar.ahmad@pfa.gov.pk',
  'muhammad.irfan@pfa.gov.pk',
  'shoaib.awan@pfa.gov.pk',
];

async function main() {
  // 1. Find the Nankana Sahib zone
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Nankana' } },
  });
  if (!zone) {
    console.error('ERROR: Nankana Sahib zone not found in DB. Check zone name.');
    process.exit(1);
  }
  console.log(`Found zone: ${zone.id} — "${zone.name}"`);

  const zoneId = zone.id;
  let updated = 0, notFound = 0, alreadyHad = 0;

  for (const email of NANKANA_EMAILS) {
    const emp = await prisma.employee.findUnique({
      where: { email },
      select: { id: true, name: true, geofenceZoneIds: true },
    });

    if (!emp) {
      console.log(`  NOT FOUND: ${email}`);
      notFound++;
      continue;
    }

    const ids = Array.isArray(emp.geofenceZoneIds) ? emp.geofenceZoneIds : [];

    if (ids.includes(zoneId)) {
      alreadyHad++;
      continue;
    }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [...ids, zoneId], updatedAt: new Date() },
    });

    console.log(`  ✓ ${emp.name} (${email})`);
    updated++;
  }

  console.log('\n=== Done ===');
  console.log(`Updated    : ${updated}`);
  console.log(`Already had: ${alreadyHad}`);
  console.log(`Not found  : ${notFound}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
