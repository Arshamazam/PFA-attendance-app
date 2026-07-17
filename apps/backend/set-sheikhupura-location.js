const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.employee.updateMany({
    where: { department: 'Sheikhupura', role: 'employee' },
    data: { officeLocation: 'Punjab Food Authority, Sheikhupura' },
  });
  console.log(`Updated ${result.count} Sheikhupura employees with office location.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
