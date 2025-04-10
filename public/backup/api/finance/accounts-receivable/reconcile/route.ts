import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { reconcileAR } from "@/app/lib/finance/ar-reconciliation";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get AR reconciliation results
    const result = await reconcileAR();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in AR reconciliation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred during reconciliation" },
      { status: 500 }
    );
  }
} 