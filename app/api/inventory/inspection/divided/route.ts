import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const { dividedId, note } = await req.json();
    if (!dividedId) {
      return NextResponse.json(
        { error: "Divided ID is required" },
        { status: 400 }
      );
    }

    // Get the divided stock to inspect
    const divided = await prisma.divided.findUnique({
      where: { id: dividedId }
    });

    if (!divided) {
      return NextResponse.json(
        { error: "Divided stock not found" },
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

    // Start a transaction to update divided stock and create log
    const result = await prisma.$transaction(async (tx) => {
      // Update the divided stock
      const updatedDivided = await tx.divided.update({
        where: { id: dividedId },
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
          type: "divided_inspected",
          itemType: "divided",
          itemIdentifier: divided.rollNo,
          userId: currentUser.id,
          userName: currentUser.name || "User",
          note: note || undefined,
          dividedId: dividedId,
        }
      });

      return { divided: updatedDivided, log };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error inspecting divided stock:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to inspect divided stock' },
      { status: 500 }
    );
  }
} 