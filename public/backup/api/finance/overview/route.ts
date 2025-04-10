import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET() {
  try {
    // Get the default user for now (we'll add auth later)
    const defaultUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' },
    });

    if (!defaultUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Get total balance from all accounts
    const accounts = await prisma.account.findMany({
      where: { userId: defaultUser.id },
      select: { balance: true },
    });
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // Get current month's income and expenses
    const currentMonthTransactions = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId: defaultUser.id,
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalIncome = currentMonthTransactions.find(t => t.type === 'income')?._sum.amount || 0;
    const totalExpenses = currentMonthTransactions.find(t => t.type === 'expense')?._sum.amount || 0;
    const netWorth = totalBalance;

    // Get last 12 months of data for charts
    const monthlyData = await Promise.all(
      Array.from({ length: 12 }).map(async (_, i) => {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));

        const transactions = await prisma.transaction.groupBy({
          by: ['type'],
          where: {
            userId: defaultUser.id,
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        return {
          income: transactions.find(t => t.type === 'income')?._sum.amount || 0,
          expense: transactions.find(t => t.type === 'expense')?._sum.amount || 0,
        };
      })
    );

    // Get active budgets with spending progress
    const budgets = await prisma.budget.findMany({
      where: {
        userId: defaultUser.id,
      },
    });

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId: defaultUser.id,
            category: budget.category,
            type: "expense",
            date: {
              gte: currentMonthStart,
              lte: currentMonthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        return {
          ...budget,
          spent: spent._sum.amount || 0,
        };
      })
    );

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: defaultUser.id,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    return NextResponse.json({
      totalBalance,
      totalIncome,
      totalExpenses,
      netWorth,
      incomeData: monthlyData.map(d => d.income).reverse(),
      expenseData: monthlyData.map(d => d.expense).reverse(),
      balanceData: monthlyData.map(d => d.income - d.expense).reverse(),
      budgets: budgetsWithSpent,
      recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching finance overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance overview" },
      { status: 500 }
    );
  }
} 