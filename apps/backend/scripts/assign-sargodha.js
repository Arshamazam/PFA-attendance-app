/**
 * Assign ONLY the Sargodha zone to all 84 Sargodha employees.
 * Replaces any existing zone assignments to ensure correctness.
 *
 * Zone: Punjab Food Authority, Sargodha  32.069206, 72.704911
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/assign-sargodha.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS = [
  'yasir.rizwan@pfa.gov.pk',
  'muhammad.sarwar2@pfa.gov.pk',
  'shahzor.abbas@pfa.gov.pk',
  'javeria.hafeez@pfa.gov.pk',
  'asma.shafiq@pfa.gov.pk',
  'saima.akram@pfa.gov.pk',
  'aqsa.nasir@pfa.gov.pk',
  'anique.daud@pfa.gov.pk',
  'rana.shabbir@pfa.gov.pk',
  'rabia.tasneem@pfa.gov.pk',
  'hafiz.khalid@pfa.gov.pk',
  'ammara.rehman@pfa.gov.pk',
  'aqsa.khalid@pfa.gov.pk',
  'arooj.fatima2@pfa.gov.pk',
  'ayesha.babur@pfa.gov.pk',
  'kashmala.waheed@pfa.gov.pk',
  'muhammad.iqbal4@pfa.gov.pk',
  'muhammad.shahid5@pfa.gov.pk',
  'sanam.mumtaz@pfa.gov.pk',
  'umais.ali@pfa.gov.pk',
  'asma.iftikhar@pfa.gov.pk',
  'nida.yousaf@pfa.gov.pk',
  'ghulam.fatima@pfa.gov.pk',
  'rehan.sarwar@pfa.gov.pk',
  'ehtisham.haq@pfa.gov.pk',
  'faisal.munir@pfa.gov.pk',
  'gohar.ali@pfa.gov.pk',
  'noman.rasul@pfa.gov.pk',
  'muhammad.khan11@pfa.gov.pk',
  'hafiz.khan@pfa.gov.pk',
  'muhammad.irfan2@pfa.gov.pk',
  'muhammad.amjad2@pfa.gov.pk',
  'muhammad.iqbal5@pfa.gov.pk',
  'muhammad.shakir@pfa.gov.pk',
  'tanveer.bilal@pfa.gov.pk',
  'mureed.sultan@pfa.gov.pk',
  'hafiz.sultan@pfa.gov.pk',
  'abdul.yousaf@pfa.gov.pk',
  'awais.akbar@pfa.gov.pk',
  'bushra.riaz@pfa.gov.pk',
  'faisal.hayat@pfa.gov.pk',
  'ibrar.hussain@pfa.gov.pk',
  'khawar.shah@pfa.gov.pk',
  'mudassar.iqbal@pfa.gov.pk',
  'muhammad.aqeel2@pfa.gov.pk',
  'muhammad.ahmad8@pfa.gov.pk',
  'muhammad.waseem@pfa.gov.pk',
  'muhammad.yousaf3@pfa.gov.pk',
  'noreen.akhtar@pfa.gov.pk',
  'rana.asghar@pfa.gov.pk',
  'shamroz.masih@pfa.gov.pk',
  'waqas.ali@pfa.gov.pk',
  'aqsa.iqbal@pfa.gov.pk',
  'aamir.shehzad@pfa.gov.pk',
  'ali.raza10@pfa.gov.pk',
  'ammar.ali@pfa.gov.pk',
  'atif.javeed@pfa.gov.pk',
  'azhar.hayat@pfa.gov.pk',
  'hafiza.yousaf@pfa.gov.pk',
  'hanan.ahmad@pfa.gov.pk',
  'irfan.haq@pfa.gov.pk',
  'muhammad.shahzad6@pfa.gov.pk',
  'muhammad.shahid6@pfa.gov.pk',
  'ramsha.shahid@pfa.gov.pk',
  'saira.akhtar@pfa.gov.pk',
  'umar.daraz@pfa.gov.pk',
  'umer.hayat2@pfa.gov.pk',
  'usama.rehman@pfa.gov.pk',
  'shumaila.khan@pfa.gov.pk',
  'ali.hassan4@pfa.gov.pk',
  'ali.raza11@pfa.gov.pk',
  'khalid.mehmood@pfa.gov.pk',
  'muhammad.kamran2@pfa.gov.pk',
  'muhammad.zeeshan3@pfa.gov.pk',
  'ubaid.rehman@pfa.gov.pk',
  'babar.ali3@pfa.gov.pk',
  'iram.shahzadi@pfa.gov.pk',
  'mehar.ramzan@pfa.gov.pk',
  'muhammad.aziz@pfa.gov.pk',
  'muhammad.iqbal6@pfa.gov.pk',
  'muhammad.naveed2@pfa.gov.pk',
  'muhammad.saud@pfa.gov.pk',
  'muzamil.aslam@pfa.gov.pk',
  'tahir.mehmood@pfa.gov.pk',
];

async function main() {
  const zone = await prisma.geofenceZone.findFirst({
    where: { name: { contains: 'Sargodha' } },
  });
  if (!zone) { console.error('Sargodha zone not found.'); process.exit(1); }
  console.log(`Zone: "${zone.name}"  (${zone.centerLat}, ${zone.centerLng})\n`);

  let assigned = 0, notFound = 0;

  for (const email of EMAILS) {
    const emp = await prisma.employee.findFirst({
      where: { email },
      select: { id: true, name: true },
    });
    if (!emp) { console.log(`  NOT FOUND: ${email}`); notFound++; continue; }

    await prisma.employee.update({
      where: { id: emp.id },
      data: { geofenceZoneIds: [zone.id], requiresGeofence: true },
    });
    console.log(`  ✓ ${emp.name}`);
    assigned++;
  }

  console.log(`\nAssigned : ${assigned}`);
  console.log(`Not found: ${notFound}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
