import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyBudgetThreshold } from "@/lib/notifications";
import { startOfMonth, endOfMonth } from "date-fns";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("[BUDGETS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, category, amount, startDate, endDate, description } = body;

    if (!name || !category || !amount || !startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const budget = await prisma.budget.create({
      data: {
        name,
        category,
        amount,
        spent: 0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        userId: session.user.id
      }
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("[BUDGET_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json(
        { error: "Budget ID is required" },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: updates,
    });

    // Check current spending against updated budget
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const spent = await prisma.transaction.aggregate({
      where: {
        userId: budget.userId,
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

    const spentAmount = spent._sum.amount || 0;
    if (spentAmount >= budget.amount * budget.alertThreshold) {
      await notifyBudgetThreshold(
        budget.userId,
        budget.name,
        budget.category,
        spentAmount,
        budget.amount
      );
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Budget ID is required" },
        { status: 400 }
      );
    }

    await prisma.budget.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
} 