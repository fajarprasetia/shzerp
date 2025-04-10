import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, barcodeValue } = body;

    if (!orderId || !barcodeValue) {
      return NextResponse.json(
        { error: "Order ID and barcode value are required" },
        { status: 400 }
      );
    }

    // Fetch order with items to validate against
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Look for a matching item in the order
    const matchingItem = order.orderItems.find(
      (item) => 
        (item.stockId && item.stockId === barcodeValue) || 
        (item.dividedId && item.dividedId === barcodeValue)
    );

    if (!matchingItem) {
      return NextResponse.json({
        matched: false,
        message: "Scanned barcode does not match any item in this order",
      });
    }

    // Check if the item is a stock item
    if (matchingItem.stockId) {
      const stock = await prisma.stock.findUnique({
        where: { id: matchingItem.stockId },
      });

      if (!stock) {
        return NextResponse.json({
          matched: false,
          message: "Stock item not found in inventory",
        });
      }

      // Check if stock has already been marked as sold
      if (stock.isSold) {
        return NextResponse.json({
          matched: false,
          message: "This stock item has already been marked as sold",
        });
      }
    }

    // Check if the item is a divided item
    if (matchingItem.dividedId) {
      const divided = await prisma.divided.findUnique({
        where: { id: matchingItem.dividedId },
      });

      if (!divided) {
        return NextResponse.json({
          matched: false,
          message: "Divided stock item not found in inventory",
        });
      }

      // Check if divided stock has already been marked as sold
      if (divided.isSold) {
        return NextResponse.json({
          matched: false,
          message: "This divided stock item has already been marked as sold",
        });
      }
    }

    // Return success with the matched item details
    return NextResponse.json({
      matched: true,
      item: matchingItem,
    });

  } catch (error) {
    console.error("[VALIDATE_BARCODE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 