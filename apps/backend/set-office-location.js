const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.employee.updateMany({
    where: { role: 'employee' },
    data: {
      officeLocation: 'Head Office 83-C, New Muslim Town near Naqsha Stop, Lahore (0800-80500)',
    },
  });
  console.log(`Updated ${result.count} employees with office location.`);
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
