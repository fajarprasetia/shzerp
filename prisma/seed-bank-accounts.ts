const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
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

main()
  .catch((e) => {
    console.error('Error seeding bank accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 