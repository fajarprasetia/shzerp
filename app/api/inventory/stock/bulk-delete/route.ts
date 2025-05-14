import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function to handle the deletion logic
async function handleBulkDelete(ids: string[]) {
  if (!ids || !Array.isArray(ids) || !ids.length) {
    return NextResponse.json(
      { error: "No IDs provided for deletion" },
      { status: 400 }
    );
  }

  // Check if any of the stocks have divided stocks
  const stocksWithDivided = await prisma.stock.findMany({
    where: {
      id: {
        in: ids,
      },
    },
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

  // Delete stocks
  await prisma.stock.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  return NextResponse.json({ success: true });
}

// Support for DELETE method
export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();
    return await handleBulkDelete(ids);
  } catch (error) {
    console.error("Error deleting stocks:", error);
    return NextResponse.json(
      { error: "Error deleting stocks" },
      { status: 500 }
    );
  }
}

// Support for POST method
export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    return await handleBulkDelete(ids);
  } catch (error) {
    console.error("Error deleting stocks:", error);
    return NextResponse.json(
      { error: "Error deleting stocks" },
      { status: 500 }
    );
  }
} 