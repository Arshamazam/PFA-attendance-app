/**
 * One-time migration: add plainPassword column to Employee table.
 *
 * Run on VPS BEFORE deploying the new backend build:
 *   DATABASE_URL="mysql://user_pfa_user:Arshamzado%40123@localhost:3306/user_attendance" \
 *   node /opt/pfa/backend/scripts/migrate-add-plain-password.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE \`Employee\`
    ADD COLUMN IF NOT EXISTS \`plainPassword\` VARCHAR(255) NULL
  `);
  console.log('Done: plainPassword column added (or already existed).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
