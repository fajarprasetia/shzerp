import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Get the divided stocks to calculate remaining length
    const dividedStocks = await prisma.divided.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    // Group by stockId to sum up lengths
    const stockUpdates = dividedStocks.reduce<Record<string, number>>((acc, divided) => {
      acc[divided.stockId] = (acc[divided.stockId] || 0) + divided.length;
      return acc;
    }, {});

    // Update parent stocks and delete divided stocks in a transaction
    await prisma.$transaction([
      ...Object.entries(stockUpdates).map(([stockId, length]) =>
        prisma.stock.update({
          where: { id: stockId },
          data: {
            remainingLength: {
              increment: length
            }
          }
        })
      ),
      prisma.divided.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting divided stocks:", error);
    return NextResponse.json({ error: "Failed to delete divided stocks" }, { status: 500 });
  }
} 