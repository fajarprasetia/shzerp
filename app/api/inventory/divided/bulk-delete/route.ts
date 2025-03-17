import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || !ids.length) {
      return NextResponse.json(
        { error: "No IDs provided for deletion" },
        { status: 400 }
      );
    }

    // Get the divided stocks to be deleted
    const dividedStocks = await prisma.divided.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        stockId: true,
        length: true,
      },
    });

    // Group by stockId to calculate total length to be returned
    const stockUpdates = dividedStocks.reduce((acc, curr) => {
      if (!acc[curr.stockId]) {
        acc[curr.stockId] = 0;
      }
      acc[curr.stockId] += curr.length;
      return acc;
    }, {} as Record<string, number>);

    // Delete divided stocks and update parent stocks in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete divided stocks
      await tx.divided.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      // Update parent stocks
      for (const [stockId, length] of Object.entries(stockUpdates)) {
        await tx.stock.update({
          where: { id: stockId },
          data: {
            length: {
              increment: length,
            },
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting divided stocks:", error);
    return NextResponse.json(
      { error: "Error deleting divided stocks" },
      { status: 500 }
    );
  }
} 