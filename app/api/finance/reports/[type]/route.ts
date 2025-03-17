import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Transaction {
  type: "credit" | "debit";
  amount: number;
  bankAccount: {
    id: string;
    name: string;
    balance: number;
  };
}

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  status: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
}

interface Bill {
  id: string;
  amount: number;
  status: string;
}

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { date } = await request.json();
    const reportDate = new Date(date);

    // Get start and end of month for the selected date
    const startOfMonth = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
    const endOfMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);

    switch (params.type) {
      case "pl": {
        // Get all transactions for the month
        const transactions = await prisma.transaction.findMany({
          where: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          include: {
            bankAccount: true,
          },
        });

        // Calculate totals
        const income = transactions
          .filter((t: Transaction) => t.type === "credit")
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const expenses = transactions
          .filter((t: Transaction) => t.type === "debit")
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const netProfit = income - expenses;

        // Return P&L data
        return NextResponse.json({
          startDate: startOfMonth,
          endDate: endOfMonth,
          income,
          expenses,
          netProfit,
          transactions,
        });
      }

      case "bs": {
        // Get all bank accounts and their balances
        const bankAccounts = await prisma.bankAccount.findMany({
          where: {
            status: "active",
          },
        });

        // Get all receivables
        const receivables = await prisma.invoice.findMany({
          where: {
            status: "pending",
          },
        });

        // Get all payables
        const payables = await prisma.bill.findMany({
          where: {
            status: "pending",
          },
        });

        // Calculate totals
        const totalAssets = bankAccounts.reduce((sum: number, acc: BankAccount) => sum + acc.balance, 0) +
          receivables.reduce((sum: number, inv: Invoice) => sum + inv.amount, 0);

        const totalLiabilities = payables.reduce((sum: number, bill: Bill) => sum + bill.amount, 0);

        const equity = totalAssets - totalLiabilities;

        // Return balance sheet data
        return NextResponse.json({
          date: reportDate,
          assets: {
            bankAccounts,
            receivables,
            total: totalAssets,
          },
          liabilities: {
            payables,
            total: totalLiabilities,
          },
          equity,
        });
      }

      default:
        return new NextResponse("Invalid report type", { status: 400 });
    }
  } catch (error) {
    console.error("Error generating report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 