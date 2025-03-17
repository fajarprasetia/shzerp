'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/**
 * Finance Service
 * 
 * This service provides centralized business logic for finance operations,
 * ensuring consistency across different components and automating common tasks.
 */

interface PaymentData {
  orderId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  status?: string;
}

interface JournalEntryData {
  orderId: string;
  entryDate: Date;
  description: string;
  reference?: string;
}

/**
 * Records a payment and automatically creates a journal entry
 */
export async function recordPaymentWithJournalEntry(paymentData: PaymentData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Start a transaction to ensure all operations succeed or fail together
    return await prisma.$transaction(async (tx) => {
      // 1. Get the order
      const order = await tx.order.findUnique({
        where: { id: paymentData.orderId },
        include: {
          customer: true,
          orderItems: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // 2. Create the payment record
      const payment = await tx.payment.create({
        data: {
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          reference: paymentData.reference,
          notes: paymentData.notes,
          status: paymentData.status || "approved",
          recordedById: session.user.id,
        },
      });

      // 3. Update the order status to paid
      await tx.order.update({
        where: { id: paymentData.orderId },
        data: {
          paymentStatus: "paid",
        },
      });

      // 4. Check if a journal entry already exists
      const existingJournalEntry = await tx.journalEntry.findFirst({
        where: { orderId: paymentData.orderId },
      });

      // 5. Create a journal entry if one doesn't exist
      if (!existingJournalEntry) {
        // Get the necessary accounts
        const salesAccount = await tx.chartOfAccount.findFirst({
          where: { name: "Sales" },
        });

        const accountsReceivable = await tx.chartOfAccount.findFirst({
          where: { name: "Accounts Receivable" },
        });

        if (!salesAccount || !accountsReceivable) {
          throw new Error("Required accounts not found. Please set up your chart of accounts first.");
        }

        // Generate a unique entry number
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        
        // Find the last entry number for today
        const lastEntry = await tx.journalEntry.findFirst({
          where: {
            entryNumber: {
              startsWith: `JE-${dateStr}-`,
            },
          },
          orderBy: {
            entryNumber: 'desc',
          },
        });
        
        let entryNumber = `JE-${dateStr}-001`;
        if (lastEntry) {
          const lastNumber = parseInt(lastEntry.entryNumber.split('-')[2]);
          entryNumber = `JE-${dateStr}-${(lastNumber + 1).toString().padStart(3, '0')}`;
        }

        // Create the journal entry
        const journalEntry = await tx.journalEntry.create({
          data: {
            entryNumber,
            date: new Date(),
            description: `Payment received for invoice ${order.orderNo}`,
            reference: paymentData.reference,
            status: "posted",
            orderId: paymentData.orderId,
            items: {
              create: [
                // Credit Sales account
                {
                  accountId: salesAccount.id,
                  description: `Sales for invoice ${order.orderNo}`,
                  amount: order.totalAmount,
                  isCredit: true,
                },
                // Debit Accounts Receivable
                {
                  accountId: accountsReceivable.id,
                  description: `Accounts Receivable for invoice ${order.orderNo}`,
                  amount: order.totalAmount,
                  isCredit: false,
                },
              ],
            },
          },
        });

        // Update account balances
        await tx.chartOfAccount.update({
          where: { id: salesAccount.id },
          data: {
            balance: {
              increment: order.totalAmount,
            },
          },
        });

        await tx.chartOfAccount.update({
          where: { id: accountsReceivable.id },
          data: {
            balance: {
              increment: order.totalAmount,
            },
          },
        });

        // Link the journal entry to the order
        await tx.order.update({
          where: { id: paymentData.orderId },
          data: {
            journalEntryId: journalEntry.id,
          },
        });
      }

      return { payment, order };
    });
  } catch (error) {
    console.error("Error in recordPaymentWithJournalEntry:", error);
    throw error;
  }
}

/**
 * Automatically reconciles transactions with bank statement
 */
export async function autoReconcileTransactions(bankAccountId: string, statementBalance: number) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Get all unreconciled transactions for this account
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        reconciled: false,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get the current book balance
    const bankAccount = await prisma.financialAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      throw new Error("Bank account not found");
    }

    const bookBalance = bankAccount.balance;
    const difference = statementBalance - bookBalance;

    // Create a reconciliation record
    const reconciliation = await prisma.reconciliation.create({
      data: {
        date: new Date(),
        bankAccountId,
        statementBalance,
        bookBalance,
        difference,
        status: Math.abs(difference) < 0.01 ? "completed" : "pending",
        notes: difference === 0 ? "Auto-reconciled" : `Difference of ${difference} found`,
        createdById: session.user.id,
      },
    });

    // If the difference is zero, mark all transactions as reconciled
    if (Math.abs(difference) < 0.01) {
      await prisma.transaction.updateMany({
        where: {
          id: {
            in: transactions.map(t => t.id),
          },
        },
        data: {
          reconciled: true,
          reconciledAt: new Date(),
          reconciliationId: reconciliation.id,
        },
      });
    }

    return {
      reconciliation,
      transactionsCount: transactions.length,
      isFullyReconciled: Math.abs(difference) < 0.01,
    };
  } catch (error) {
    console.error("Error in autoReconcileTransactions:", error);
    throw error;
  }
}

/**
 * Generates financial reports
 */
export async function generateFinancialReport(reportType: string, startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    let report;

    switch (reportType) {
      case 'income-statement':
        report = await generateIncomeStatement(startDate, endDate);
        break;
      case 'balance-sheet':
        report = await generateBalanceSheet(endDate);
        break;
      case 'cash-flow':
        report = await generateCashFlowStatement(startDate, endDate);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return report;
  } catch (error) {
    console.error(`Error generating ${reportType} report:`, error);
    throw error;
  }
}

async function generateIncomeStatement(startDate: Date, endDate: Date) {
  // Get all revenue accounts
  const revenueAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: 'revenue',
    },
  });

  // Get all expense accounts
  const expenseAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: 'expense',
    },
  });

  // Get journal entries for the period
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'posted',
    },
    include: {
      items: {
        include: {
          account: true,
        },
      },
    },
  });

  // Calculate totals
  const revenues = calculateAccountTotals(journalEntries, revenueAccounts, true);
  const expenses = calculateAccountTotals(journalEntries, expenseAccounts, false);

  const totalRevenue = Object.values(revenues).reduce((sum, value) => sum + value, 0);
  const totalExpenses = Object.values(expenses).reduce((sum, value) => sum + value, 0);
  const netIncome = totalRevenue - totalExpenses;

  return {
    startDate,
    endDate,
    revenues,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome,
  };
}

async function generateBalanceSheet(asOfDate: Date) {
  // Get all asset accounts
  const assetAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: 'asset',
    },
  });

  // Get all liability accounts
  const liabilityAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: 'liability',
    },
  });

  // Get all equity accounts
  const equityAccounts = await prisma.chartOfAccount.findMany({
    where: {
      type: 'equity',
    },
  });

  // Calculate totals
  const assets = assetAccounts.reduce((acc, account) => {
    acc[account.name] = account.balance;
    return acc;
  }, {} as Record<string, number>);

  const liabilities = liabilityAccounts.reduce((acc, account) => {
    acc[account.name] = account.balance;
    return acc;
  }, {} as Record<string, number>);

  const equity = equityAccounts.reduce((acc, account) => {
    acc[account.name] = account.balance;
    return acc;
  }, {} as Record<string, number>);

  const totalAssets = Object.values(assets).reduce((sum, value) => sum + value, 0);
  const totalLiabilities = Object.values(liabilities).reduce((sum, value) => sum + value, 0);
  const totalEquity = Object.values(equity).reduce((sum, value) => sum + value, 0);

  return {
    asOfDate,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
}

async function generateCashFlowStatement(startDate: Date, endDate: Date) {
  // Get all cash transactions for the period
  const cashTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      bankAccount: {
        accountType: 'cash',
      },
    },
    include: {
      bankAccount: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Categorize cash flows
  const operatingActivities = cashTransactions.filter(t => 
    t.category === 'Sales' || 
    t.category === 'Rent' || 
    t.category === 'Utilities' || 
    t.category === 'Salaries'
  );

  const investingActivities = cashTransactions.filter(t => 
    t.category === 'Equipment Purchase' || 
    t.category === 'Investment'
  );

  const financingActivities = cashTransactions.filter(t => 
    t.category === 'Loan' || 
    t.category === 'Dividend'
  );

  // Calculate totals
  const operatingCashFlow = calculateCashFlow(operatingActivities);
  const investingCashFlow = calculateCashFlow(investingActivities);
  const financingCashFlow = calculateCashFlow(financingActivities);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  return {
    startDate,
    endDate,
    operatingActivities: groupTransactionsByCategory(operatingActivities),
    investingActivities: groupTransactionsByCategory(investingActivities),
    financingActivities: groupTransactionsByCategory(financingActivities),
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    netCashFlow,
  };
}

// Helper functions
function calculateAccountTotals(
  journalEntries: any[],
  accounts: any[],
  isCredit: boolean
) {
  const totals: Record<string, number> = {};

  accounts.forEach(account => {
    totals[account.name] = 0;
  });

  journalEntries.forEach(entry => {
    entry.items.forEach((item: any) => {
      if (accounts.some(a => a.id === item.accountId) && item.isCredit === isCredit) {
        totals[item.account.name] = (totals[item.account.name] || 0) + item.amount;
      }
    });
  });

  return totals;
}

function calculateCashFlow(transactions: any[]) {
  return transactions.reduce((sum, t) => {
    return sum + (t.type === 'credit' ? t.amount : -t.amount);
  }, 0);
}

function groupTransactionsByCategory(transactions: any[]) {
  const grouped: Record<string, number> = {};

  transactions.forEach(t => {
    const category = t.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = 0;
    }
    grouped[category] += t.type === 'credit' ? t.amount : -t.amount;
  });

  return grouped;
} 