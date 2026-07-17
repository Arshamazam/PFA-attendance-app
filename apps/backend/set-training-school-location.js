const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OFFICE = 'Punjab Food Authority Training School Multan Road';

const cnics = [
  // Director Operations (Lahore) staff
  '37405-9886510-0', // Aina Rafique
  '35501-0115469-2', // Naila Nazeer
  '35401-7103983-1', // Yasrab Ashraf
  '35202-41234472',  // Nida Malik
  '35202-2824982-9', // Muhammad Usama Arshad
  '35202-4663680-1', // Muhammad Rafi
  '35202-1413860-1', // Muhammd Mehran
  '35201-9326164-1', // Muhammad Khurram Shahid
  '35202-7907903-7', // Bilal Ahmad
  '35202-0973481-5', // Muhammad Irfan Akram
  '35202-1921763-1', // Talha Bin Sajid
  '35202-8518553-1', // Muhammad Bilal Khan
  // Additional Director Operations (Lahore Division) staff
  '54400-9410107-7', // M. Fahd Javed
  '35201-4940635-3', // Salman Dawood
  '35103-6567067-1', // M. Waris
  '35101-6574706-1', // Shaban Mohsin
  '33105-9899141-1', // M Hamid Rafi
  '35202-7494674-5', // Naseer Ali
];

async function main() {
  let updated = 0;
  let notFound = 0;

  for (const cnic of cnics) {
    const result = await prisma.employee.updateMany({
      where: { cnic },
      data: { officeLocation: OFFICE },
    });
    if (result.count > 0) {
      updated++;
    } else {
      console.log(`  NOT FOUND: ${cnic}`);
      notFound++;
    }
  }

  console.log(`Done. Updated: ${updated}, Not found in DB: ${notFound}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
