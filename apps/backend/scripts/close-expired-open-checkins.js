const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Shift end times in PKT (UTC+5)
// morning: 17:00 PKT = 12:00 UTC
// evening: 01:00+1 PKT = 20:00 UTC (same calendar day as check-in)
function shiftEndUtc(checkInTime, shift) {
  const d = new Date(checkInTime);
  if (shift === 'morning') {
    // 5:00 PM PKT = 12:00 UTC on same UTC date as check-in
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
  }
  if (shift === 'evening') {
    // 1:00 AM PKT next day = 20:00 UTC on same UTC date as check-in
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 20, 0, 0));
  }
  return null;
}

async function main() {
  const nowUtc = new Date();

  // Only morning shift open check-ins from the last 48 hours
  const cutoff = new Date(nowUtc.getTime() - 48 * 60 * 60 * 1000);
  const openRecords = await prisma.attendance.findMany({
    where: {
      checkOutTime: null,
      shift: 'morning',
      checkInTime: { gte: cutoff },
    },
    include: {
      employee: { select: { name: true, email: true, department: true } },
    },
    orderBy: { checkInTime: 'asc' },
  });

  console.log(`\nFound ${openRecords.length} open check-ins in the last 48 hours`);
  console.log(`Current UTC time: ${nowUtc.toISOString()}\n`);

  let closed = 0;
  let stillOpen = 0;
  let noShift = 0;

  for (const rec of openRecords) {
    const shiftEnd = shiftEndUtc(rec.checkInTime, rec.shift);

    if (!shiftEnd) {
      noShift++;
      console.log(`  ⚠  No shift info — skipping: ${rec.employee.name} (${rec.employee.email})`);
      continue;
    }

    // Only close records where the shift has already ended
    if (nowUtc > shiftEnd && shiftEnd > rec.checkInTime) {
      await prisma.attendance.update({
        where: { id: rec.id },
        data: {
          checkOutTime: shiftEnd,
          status: 'auto_checkout',
          updatedAt: nowUtc,
        },
      });

      const checkInPkt = new Date(rec.checkInTime.getTime() + 5 * 60 * 60 * 1000);
      const checkOutPkt = new Date(shiftEnd.getTime() + 5 * 60 * 60 * 1000);
      console.log(
        `  ✓ Closed: ${rec.employee.name} | ${rec.employee.department} | ` +
        `${rec.shift} | in=${checkInPkt.toISOString().slice(11,16)} PKT → out=${checkOutPkt.toISOString().slice(11,16)} PKT`
      );
      closed++;
    } else {
      stillOpen++;
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Closed (shift ended):     ${closed}`);
  console.log(`  Still open (within shift): ${stillOpen}`);
  if (noShift > 0) console.log(`  Skipped (no shift data):  ${noShift}`);
  console.log('─'.repeat(60) + '\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
