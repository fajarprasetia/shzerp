import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    // Check if any stocks have divided stocks
    const stocksWithDivided = await prisma.stock.findMany({
      include: {
        _count: {
          select: {
            divided: true,
          },
        },
      },
    });

    const stocksWithDividedStocks = stocksWithDivided.filter(
      (stock) => stock._count.divided > 0
    );

    if (stocksWithDividedStocks.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete stocks with divided stocks. Please delete divided stocks first.",
          stocks: stocksWithDividedStocks.map((s) => s.jumboRollNo),
        },
        { status: 400 }
      );
    }

    // Delete all stocks
    await prisma.stock.deleteMany();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting all stocks:", error);
    return NextResponse.json(
      { error: "Error deleting all stocks" },
      { status: 500 }
    );
  }
} 