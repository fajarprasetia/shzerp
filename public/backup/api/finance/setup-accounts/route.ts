import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Define the required accounts for journal entries
const REQUIRED_ACCOUNTS = [
  {
    code: "1000",
    name: "Cash",
    type: "ASSET",
    category: "CURRENT_ASSET",
    description: "Cash on hand and in bank"
  },
  {
    code: "1200",
    name: "Accounts Receivable",
    type: "ASSET",
    category: "CURRENT_ASSET",
    description: "Amounts owed by customers"
  },
  {
    code: "1300",
    name: "Inventory",
    type: "ASSET",
    category: "CURRENT_ASSET",
    description: "Value of goods in stock"
  },
  {
    code: "2000",
    name: "Accounts Payable",
    type: "LIABILITY",
    category: "CURRENT_LIABILITY",
    description: "Amounts owed to vendors"
  },
  {
    code: "3000",
    name: "Retained Earnings",
    type: "EQUITY",
    category: "EQUITY",
    description: "Accumulated earnings"
  },
  {
    code: "4000",
    name: "Sales",
    type: "REVENUE",
    category: "OPERATING_REVENUE",
    description: "Income from sales"
  },
  {
    code: "5000",
    name: "Cost of Goods Sold",
    type: "EXPENSE",
    category: "COST_OF_SALES",
    description: "Direct cost of goods sold"
  }
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSystemAdmin: true }
    });

    if (!user?.isSystemAdmin) {
      return NextResponse.json(
        { error: "Only system administrators can set up accounts" },
        { status: 403 }
      );
    }

    // Check for existing accounts
    const existingAccounts = await prisma.chartOfAccount.findMany({
      select: { code: true, name: true }
    });

    const existingCodes = new Set(existingAccounts.map(acc => acc.code));
    const existingNames = new Set(existingAccounts.map(acc => acc.name));

    // Filter out accounts that already exist
    const accountsToCreate = REQUIRED_ACCOUNTS.filter(
      acc => !existingCodes.has(acc.code) && !existingNames.has(acc.name)
    );

    if (accountsToCreate.length === 0) {
      return NextResponse.json({
        message: "All required accounts already exist",
        created: 0
      });
    }

    // Create the missing accounts
    const createdAccounts = await prisma.$transaction(
      accountsToCreate.map(account => 
        prisma.chartOfAccount.create({
          data: {
            ...account,
            isActive: true,
            balance: 0,
            updatedAt: new Date()
          }
        })
      )
    );

    return NextResponse.json({
      message: "Required accounts have been set up successfully",
      created: createdAccounts.length,
      accounts: createdAccounts
    });
  } catch (error) {
    console.error("Error setting up accounts:", error);
    return NextResponse.json(
      { error: "Failed to set up accounts" },
      { status: 500 }
    );
  }
} 