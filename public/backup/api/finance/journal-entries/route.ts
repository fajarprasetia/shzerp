import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { 
  journalEntrySchema,
  validateAccountTypes,
  validateAccountBalances,
  validateARTransaction,
  validateJournalEntry
} from "@/lib/finance/validation";

interface JournalEntryItem {
  id: string;
  journalEntryId: string;
  debit: number;
  credit: number;
  description?: string | null;
}

interface JournalEntry {
  id: string;
  entryNo: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  postedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: JournalEntryItem[];
}

interface JournalEntryTotals {
  totalDebit: number;
  totalCredit: number;
}

interface JournalEntryItemInput {
  debit: number | string;
  credit: number | string;
  description?: string;
}

// Helper function to generate a unique entry number
async function generateEntryNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const lastEntry = await prisma.journalEntry.findFirst({
    where: {
      entryNo: {
        startsWith: `JE${year}${month}`
      }
    },
    orderBy: {
      entryNo: 'desc'
    }
  });

  const sequence = lastEntry 
    ? String(Number(lastEntry.entryNo.slice(-4)) + 1).padStart(4, '0')
    : '0001';

  return `JE${year}${month}${sequence}`;
}

// Helper function to get or create system accounts
async function getSystemAccounts() {
  const accounts = await prisma.financialAccount.findMany({
    where: { isSystemAccount: true }
  });

  if (accounts.length === 0) {
    throw new Error("System accounts not found. Please ensure system accounts are created.");
  }

  const accountMap = accounts.reduce((acc: Record<string, any>, account: { name: string; id: string }) => {
    acc[account.name] = account;
    return acc;
  }, {} as Record<string, any>);

  return accountMap;
}

// Create a journal entry for a sales order
async function createSalesOrderEntry(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
      customer: true
    }
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const systemAccounts = await getSystemAccounts();
  const entryNo = await generateEntryNo();

  // Calculate totals
  const totalAmount = order.totalAmount;
  const description = `Sales Order ${order.orderNo} - ${order.customer.name}`;

  // Create journal entry
  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNo,
      date: new Date(),
      description,
      status: "POSTED",
      postedAt: new Date(),
      items: {
        create: [
          // Debit Accounts Receivable
          {
            accountId: systemAccounts["Accounts Receivable"].id,
            debit: totalAmount,
            credit: 0,
            description: `AR - ${order.orderNo}`
          },
          // Credit Sales Revenue
          {
            accountId: systemAccounts["Sales Revenue"].id,
            debit: 0,
            credit: totalAmount,
            description: `Revenue - ${order.orderNo}`
          }
        ]
      }
    },
    include: {
      items: true
    }
  });

  // Update account balances
  await prisma.$transaction([
    // Increase Accounts Receivable
    prisma.financialAccount.update({
      where: { id: systemAccounts["Accounts Receivable"].id },
      data: { balance: { increment: totalAmount } }
    }),
    // Increase Sales Revenue
    prisma.financialAccount.update({
      where: { id: systemAccounts["Sales Revenue"].id },
      data: { balance: { increment: totalAmount } }
    })
  ]);

  return journalEntry;
}

// Create a journal entry for a payment
async function createPaymentEntry(orderId: string, amount: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true
    }
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const systemAccounts = await getSystemAccounts();
  const entryNo = await generateEntryNo();
  const description = `Payment received for Order ${order.orderNo} - ${order.customer.name}`;

  // Create journal entry
  const journalEntry = await prisma.journalEntry.create({
    data: {
      entryNo,
      date: new Date(),
      description,
      status: "POSTED",
      postedAt: new Date(),
      items: {
        create: [
          // Debit Cash
          {
            accountId: systemAccounts["Cash"].id,
            debit: amount,
            credit: 0,
            description: `Cash received - ${order.orderNo}`
          },
          // Credit Accounts Receivable
          {
            accountId: systemAccounts["Accounts Receivable"].id,
            debit: 0,
            credit: amount,
            description: `AR Payment - ${order.orderNo}`
          }
        ]
      }
    },
    include: {
      items: true
    }
  });

  // Update account balances
  await prisma.$transaction([
    // Increase Cash
    prisma.financialAccount.update({
      where: { id: systemAccounts["Cash"].id },
      data: { balance: { increment: amount } }
    }),
    // Decrease Accounts Receivable
    prisma.financialAccount.update({
      where: { id: systemAccounts["Accounts Receivable"].id },
      data: { balance: { decrement: amount } }
    })
  ]);

  return journalEntry;
}

// Validate journal entry
function validateJournalEntry(items: any[]) {
  const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
  
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error("Total debits must equal total credits");
  }

  // Validate account types
  for (const item of items) {
    if (!item.accountId) {
      throw new Error("All items must have an account");
    }
  }
}

// Create a journal entry
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate journal entry data
    const validatedData = journalEntrySchema.parse(body);
    const { date, description, reference, items } = validatedData;

    // Get all accounts for validation
    const accounts = await prisma.chartOfAccount.findMany();

    // Validate account types and balances
    validateAccountTypes(items, accounts);
    validateAccountBalances(items, accounts);
    validateARTransaction(items, accounts);

    // Generate entry number
    const entryNo = await generateEntryNo();

    // Create journal entry in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      // Create the entry
      const entry = await tx.journalEntry.create({
        data: {
          entryNo,
          date: new Date(date),
          description,
          reference,
          status: "DRAFT",
          items: {
            create: items.map(item => ({
              accountId: item.accountId,
              description: item.description,
              debit: item.debit || 0,
              credit: item.credit || 0
            }))
          }
        },
        include: {
          items: {
            include: {
              account: true
            }
          }
        }
      });

      return entry;
    });

    return NextResponse.json(journalEntry);
  } catch (error) {
    console.error("[JOURNAL_ENTRY_POST]", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    const where = orderId ? {
      OR: [
        { description: { contains: orderId } },
        { items: { some: { description: { contains: orderId } } } }
      ]
    } : {};

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        items: {
          include: {
            account: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[JOURNAL_ENTRIES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 