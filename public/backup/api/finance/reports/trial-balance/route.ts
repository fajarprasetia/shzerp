import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { 
  ACCOUNT_TYPES,
  AccountType,
  TrialBalanceRow, 
  TrialBalanceSummary,
} from "@/types/finance";
import { FinancialAccount, Transaction } from "@prisma/client";

type FinancialAccountWithTransactions = FinancialAccount & {
  transactions: Transaction[];
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the date parameter
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const asOfDate = dateStr ? new Date(dateStr) : new Date();

    // Get all accounts with their transactions up to the specified date
    const accounts = await prisma.financialAccount.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        transactions: {
          where: {
            date: {
              lte: asOfDate
            }
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    }) as FinancialAccountWithTransactions[];

    // Initialize summary
    const summary: TrialBalanceSummary = {
      totalDebit: 0,
      totalCredit: 0,
      byType: {
        [ACCOUNT_TYPES.ASSET]: { debit: 0, credit: 0 },
        [ACCOUNT_TYPES.LIABILITY]: { debit: 0, credit: 0 },
        [ACCOUNT_TYPES.EQUITY]: { debit: 0, credit: 0 },
        [ACCOUNT_TYPES.REVENUE]: { debit: 0, credit: 0 },
        [ACCOUNT_TYPES.EXPENSE]: { debit: 0, credit: 0 },
      },
    };

    // Calculate balances for each account
    const balances: TrialBalanceRow[] = accounts.map((account: FinancialAccountWithTransactions) => {
      const totalIncome = account.transactions
        .filter((t: Transaction) => t.type === 'income')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
      const totalExpense = account.transactions
        .filter((t: Transaction) => t.type === 'expense')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      let debit = 0;
      let credit = 0;

      // Map account types to our trial balance types
      const accountType = mapAccountType(account.type);
      const netBalance = totalIncome - totalExpense;
      
      switch (accountType) {
        case ACCOUNT_TYPES.ASSET:
        case ACCOUNT_TYPES.EXPENSE:
          if (netBalance > 0) {
            debit = netBalance;
          } else {
            credit = -netBalance;
          }
          break;
        case ACCOUNT_TYPES.LIABILITY:
        case ACCOUNT_TYPES.EQUITY:
        case ACCOUNT_TYPES.REVENUE:
          if (netBalance > 0) {
            credit = netBalance;
          } else {
            debit = -netBalance;
          }
          break;
      }

      // Update summary
      summary.totalDebit += debit;
      summary.totalCredit += credit;
      summary.byType[accountType].debit += debit;
      summary.byType[accountType].credit += credit;

      return {
        id: account.id,
        code: account.id.slice(-6).toUpperCase(), // Generate a code from the ID
        name: account.name,
        type: accountType,
        debit,
        credit,
      };
    });

    // Filter out accounts with no activity
    const activeBalances = balances.filter(
      balance => balance.debit !== 0 || balance.credit !== 0
    );

    return NextResponse.json({
      accounts: activeBalances,
      summary,
      asOfDate,
    });
  } catch (error) {
    console.error("[TRIAL_BALANCE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Helper function to map financial account types to trial balance types
function mapAccountType(type: string): AccountType {
  const typeMap: Record<string, AccountType> = {
    'checking': ACCOUNT_TYPES.ASSET,
    'savings': ACCOUNT_TYPES.ASSET,
    'investment': ACCOUNT_TYPES.ASSET,
    'credit': ACCOUNT_TYPES.LIABILITY,
    'loan': ACCOUNT_TYPES.LIABILITY,
  };

  return typeMap[type] || ACCOUNT_TYPES.ASSET;
} 