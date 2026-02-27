// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1. Hash the admin password
  const adminPassword = 'admin1234'; // Change this for your demo
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  // 2. Create the Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trenzobd.com' },
    update: {}, // If user exists, do nothing
    create: {
      email: 'admin@trenzobd.com',
      fullName: 'System Administrator',
      phone: '01700000000', // Use a real-format number for your SMS testing
      password: hashedAdminPassword,
      role: 'ADMIN',
      isVerified: true, // Admin should be pre-verified
    },
  });

  console.log(`✅ Admin created with email: ${admin.email}`);
  console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });