import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { remainingLength } = await req.json();
    if (typeof remainingLength !== "number" || remainingLength < 0) {
      return NextResponse.json({ error: "Invalid remainingLength" }, { status: 400 });
    }
    const stock = await prisma.stock.findUnique({ where: { id } });
    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }
    const oldRemainingLength = stock.remainingLength;
    const updatedStock = await prisma.stock.update({
      where: { id },
      data: { remainingLength },
    });

    // Get user (real user if available)
    let userId = "system";
    let userName = "System";
    try {
      const session = await auth();
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (user) {
          userId = user.id;
          userName = user.name || "User";
        }
      }
    } catch {}

    // Log the change with old and new values
    await prisma.inspectionLog.create({
      data: {
        type: "stock_remaining_length_changed",
        itemType: "stock",
        itemIdentifier: stock.jumboRollNo,
        userId,
        userName,
        note: `Remaining length changed from ${oldRemainingLength} to ${remainingLength}`,
        stockId: id,
      }
    });

    return NextResponse.json(updatedStock);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update remaining length" }, { status: 500 });
  }
} 