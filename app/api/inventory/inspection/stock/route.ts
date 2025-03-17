import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

// Remove auth temporarily since we don't have it set up yet
export async function POST(req: Request) {
  try {
    const { stockId, note } = await req.json();
    if (!stockId) {
      return NextResponse.json(
        { error: "Stock ID is required" },
        { status: 400 }
      );
    }

    // Get the stock to inspect
    const stock = await prisma.stock.findUnique({
      where: { id: stockId }
    });

    if (!stock) {
      return NextResponse.json(
        { error: "Stock not found" },
        { status: 404 }
      );
    }

    // Get the current user from the session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the current user from the database
    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Start a transaction to update stock and create log
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // Update the stock
      const updatedStock = await tx.stock.update({
        where: { id: stockId },
        data: {
          inspected: true,
          inspectedAt: new Date(),
          inspectedById: currentUser.id
        },
        include: {
          inspectedBy: true
        }
      });

      // Create inspection log
      const log = await tx.inspectionLog.create({
        data: {
          type: "stock_inspected",
          itemType: "stock",
          itemIdentifier: stock.jumboRollNo,
          userId: currentUser.id,
          userName: currentUser.name || "User",
          note: note || undefined,
          stockId: stockId,
        }
      });

      return { stock: updatedStock, log };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error inspecting stock:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to inspect stock' },
      { status: 500 }
    );
  }
} 