import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyBudgetThreshold } from "@/lib/notifications";
import { startOfMonth, endOfMonth } from "date-fns";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fiscalYear: true,
        items: true
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
    const { name, fiscalYearId, description, items } = body;

    if (!name || !fiscalYearId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const budget = await prisma.budget.create({
      data: {
        name,
        fiscalYearId,
        description,
        items: {
          create: items || []
        }
      },
      include: {
        fiscalYear: true,
        items: true
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

    // Check if budget exists
    const existingBudget = await prisma.budget.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    // Handle budget item updates if provided
    let updateData: any = { ...updates };
    if (updates.items) {
      // If items are provided, handle them separately
      delete updateData.items;
      
      // First delete existing items
      await prisma.budgetItem.deleteMany({
        where: { budgetId: id }
      });
      
      // Then create new items
      if (Array.isArray(updates.items) && updates.items.length > 0) {
        await prisma.budgetItem.createMany({
          data: updates.items.map((item: any) => ({
            ...item,
            budgetId: id
          }))
        });
      }
    }

    // Update the budget
    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        fiscalYear: true,
        items: true
      }
    });

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