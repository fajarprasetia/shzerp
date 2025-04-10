const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// For seeding users and roles
async function seedUsers() {
  console.log('Starting users seed script...');

  // Create roles first
  const systemAdminRole = await prisma.role.upsert({
    where: { name: 'System Administrator' },
    update: {
      description: 'Full system access with all permissions',
      isAdmin: true,
    },
    create: {
      name: 'System Administrator',
      description: 'Full system access with all permissions',
      isAdmin: true,
    },
  });

  console.log('Created System Administrator role:', systemAdminRole.id);

  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {
      description: 'Administrative access to most system features',
      isAdmin: true,
    },
    create: {
      name: 'Administrator',
      description: 'Administrative access to most system features',
      isAdmin: true,
    },
  });

  console.log('Created Administrator role:', adminRole.id);

  // Define resources and actions for permissions
  const resources = [
    'dashboard',
    'users',
    'roles',
    'inventory',
    'sales',
    'customers',
    'finance',
    'tasks',
    'settings',
    'shipment',
  ];

  const actions = ['read', 'write', 'delete'];

  // Create permissions for both roles
  for (const resource of resources) {
    for (const action of actions) {
      // For System Admin role
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: systemAdminRole.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          roleId: systemAdminRole.id,
          resource,
          action,
        },
      });

      // For Admin role
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: adminRole.id,
            resource,
            action,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          resource,
          action,
        },
      });
    }
  }

  console.log('Created permissions for both roles');

  // Create system administrator user
  const systemAdminPassword = await bcrypt.hash('shunhui2025', 10);
  const systemAdminUser = await prisma.user.upsert({
    where: { email: 'systemadministrator@shunhuizhiye.id' },
    update: {
      name: 'System Administrator',
      hashedPassword: systemAdminPassword,
      roleId: systemAdminRole.id,
      isSystemAdmin: true,
      isSystemUser: true,
    },
    create: {
      email: 'systemadministrator@shunhuizhiye.id',
      name: 'System Administrator',
      hashedPassword: systemAdminPassword,
      roleId: systemAdminRole.id,
      isSystemAdmin: true,
      isSystemUser: true,
    },
  });

  console.log('Created System Administrator user:', systemAdminUser.id);

  // Create admin user
  const adminPassword = await bcrypt.hash('adminshz@2025', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shunhuizhiye.id' },
    update: {
      name: 'Administrator',
      hashedPassword: adminPassword,
      roleId: adminRole.id,
      isSystemAdmin: false,
      isSystemUser: true,
    },
    create: {
      email: 'admin@shunhuizhiye.id',
      name: 'Administrator',
      hashedPassword: adminPassword,
      roleId: adminRole.id,
      isSystemAdmin: false,
      isSystemUser: true,
    },
  });

  console.log('Created Administrator user:', adminUser.id);

  console.log('Users seed completed successfully!');
}

// For seeding bank accounts
async function seedBankAccounts() {
  console.log('Starting bank accounts seed script...');
  
  // Delete existing bank accounts
  await prisma.bankAccount.deleteMany({});
  
  // Create sample bank accounts
  const bankAccounts = [
    {
      accountName: "Main Business Account",
      accountNumber: "1234567890",
      bankName: "BCA",
      balance: 25000000,
      currency: "IDR",
      status: "active",
      description: "Primary business account for daily operations",
    },
    {
      accountName: "Savings Account",
      accountNumber: "0987654321",
      bankName: "Mandiri",
      balance: 15000000,
      currency: "IDR",
      status: "active",
      description: "Savings account for reserves",
    },
    {
      accountName: "Tax Account",
      accountNumber: "5678901234",
      bankName: "BNI",
      balance: 5000000,
      currency: "IDR",
      status: "active",
      description: "Account for tax payments",
    },
  ];
  
  for (const account of bankAccounts) {
    await prisma.bankAccount.create({
      data: account,
    });
  }
  
  console.log('Bank accounts seeded successfully');
}

// Main seed function
async function main() {
  console.log('Starting database seeding...');
  
  // Run seed functions sequentially
  await seedUsers();
  await seedBankAccounts();
  
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 