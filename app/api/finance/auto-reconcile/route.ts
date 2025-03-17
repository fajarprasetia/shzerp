import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { autoReconcileTransactions } from "@/app/lib/finance-service";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bankAccountId, statementBalance, date, notes } = body;

    if (!bankAccountId || !statementBalance) {
      return NextResponse.json(
        { error: "Bank account ID and statement balance are required" },
        { status: 400 }
      );
    }

    // Use the finance service to auto-reconcile transactions
    const result = await autoReconcileTransactions(bankAccountId, statementBalance);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in auto-reconcile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred during auto-reconciliation" },
      { status: 500 }
    );
  }
} 