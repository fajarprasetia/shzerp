const { PrismaClient } = require('@prisma/client');
// We'll use dynamic import for bcrypt

// Create a new PrismaClient instance
const prisma = new PrismaClient();

async function main() {
  // Dynamically import bcrypt
  const bcrypt = await import('bcrypt');
  
  // Create admin user with password
  const adminPassword = 'Admin@123'; // Strong default password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      hashedPassword,
    },
    create: {
      email: 'admin@example.com',
      name: 'Administrator',
      hashedPassword,
      isSystemUser: true,
    },
  });

  console.log('Admin user created:');
  console.log({
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    password: adminPassword, // Only log this during development
  });
  
  // You can add more seed data here
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 