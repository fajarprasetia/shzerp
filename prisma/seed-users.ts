const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// Create a new PrismaClient instance
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed script...');

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

  console.log('Seed script completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 