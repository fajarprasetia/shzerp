import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { fixARDiscrepancy } from "@/app/lib/finance/ar-reconciliation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
        const orderId = id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Fix the AR discrepancy for the specified order
    await fixARDiscrepancy(orderId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error fixing AR discrepancy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred while fixing the discrepancy" },
      { status: 500 }
    );
  }
} 