/**
 * One-time migration: recalculate the `status` field for all attendance records
 * using the correct 9:30 AM cutoff for morning shift and 5:30 PM for evening shift.
 *
 * Run on VPS:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/fix-attendance-status.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function correctStatus(checkInTime, shift) {
  // Don't touch auto_checkout records
  const pkt = new Date(checkInTime.getTime() + PKT_OFFSET_MS);
  const h = pkt.getUTCHours();
  const m = pkt.getUTCMinutes();
  const totalMinutes = h * 60 + m;

  if (shift === 'evening') {
    // Evening shift: on_time if <= 17:30 PKT
    return totalMinutes <= 17 * 60 + 30 ? 'on_time' : 'late';
  }

  // Morning shift (or no shift): on_time if <= 09:30 PKT
  return totalMinutes <= 9 * 60 + 30 ? 'on_time' : 'late';
}

async function main() {
  console.log('Fetching all attendance records...');

  const records = await prisma.attendance.findMany({
    where: {
      status: { in: ['on_time', 'late'] }, // skip auto_checkout
    },
    select: { id: true, checkInTime: true, shift: true, status: true, lateReason: true },
  });

  console.log(`Found ${records.length} records to evaluate.`);

  let fixed = 0;
  let skipped = 0;

  for (const r of records) {
    // If there's a manual lateReason, keep it as late regardless
    if (r.lateReason && r.status === 'late') {
      skipped++;
      continue;
    }

    const correct = correctStatus(r.checkInTime, r.shift);

    if (correct !== r.status) {
      await prisma.attendance.update({
        where: { id: r.id },
        data: { status: correct },
      });
      fixed++;

      const pkt = new Date(r.checkInTime.getTime() + PKT_OFFSET_MS);
      const timeStr = `${String(pkt.getUTCHours()).padStart(2,'0')}:${String(pkt.getUTCMinutes()).padStart(2,'0')}`;
      console.log(`  Fixed ${r.id}: ${r.status} → ${correct} (check-in ${timeStr} PKT, shift=${r.shift ?? 'none'})`);
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Already correct: ${skipped}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
