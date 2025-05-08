import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface ScannedItem {
  orderItemId: string;
  stockId?: string | null;
  dividedId?: string | null;
  barcode: string;
}

interface ProcessShipmentRequest {
  orderId: string;
  scannedItems: ScannedItem[];
  notes?: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as ProcessShipmentRequest;
    const { orderId, scannedItems, notes } = body;

    console.log(`Processing shipment for order ${orderId} with ${scannedItems.length} scanned items`);

    // Validate request
    if (!orderId || !scannedItems || !scannedItems.length) {
      return NextResponse.json({
        error: "Order ID and at least one scanned item are required"
      }, { status: 400 });
    }

    // Check if order exists and is valid for shipment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        customer: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "shipped") {
      return NextResponse.json({ error: "Order has already been shipped" }, { status: 400 });
    }

    // Validate that all order items have the correct number of scans
    const itemQuantityMap = new Map<string, number>();
    for (const scan of scannedItems) {
      itemQuantityMap.set(scan.orderItemId, (itemQuantityMap.get(scan.orderItemId) || 0) + 1);
    }

    // Check if any items don't have the correct number of scans
    for (const item of order.orderItems) {
      const scannedCount = itemQuantityMap.get(item.id) || 0;
      if (scannedCount !== item.quantity) {
        return NextResponse.json({
          error: `Order item ${item.id} requires ${item.quantity} scans but has ${scannedCount}`,
          orderItem: item,
          scannedCount
        }, { status: 400 });
      }
    }

    // Create the shipment record
    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        shippedBy: session.user.id,
        notes: notes || "",
        shipmentDate: new Date(),
        items: {
          create: scannedItems.map(item => ({
            orderItemId: item.orderItemId,
            scannedBarcode: item.barcode,
            stockId: item.stockId,
            dividedId: item.dividedId
          }))
        }
      },
      include: {
        items: true
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "shipped" }
    });

    // Use a Set to avoid duplicate updates
    const updatedDividedIds = new Set<string>();
    const updatedStockIds = new Set<string>();
    for (const item of scannedItems) {
      if (item.stockId && !updatedStockIds.has(item.stockId)) {
        // Check if stock exists and is not already sold
        const stock = await prisma.stock.findUnique({
          where: { id: item.stockId }
        });
        if (stock && !stock.isSold) {
          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              isSold: true,
              orderNo: order.orderNo,
              soldDate: new Date(),
              customerName: order.customer?.name || "Unknown"
            }
          });
          updatedStockIds.add(item.stockId);
          console.log(`Marked stock ${item.stockId} as sold`);
        }
      }
      if (item.dividedId && !updatedDividedIds.has(item.dividedId)) {
        // Check if divided exists and is not already sold
        const divided = await prisma.divided.findUnique({
          where: { id: item.dividedId }
        });
        if (divided && !divided.isSold) {
          await prisma.divided.update({
            where: { id: item.dividedId },
            data: {
              isSold: true,
              orderNo: order.orderNo,
              soldDate: new Date(),
              customerName: order.customer?.name || "Unknown"
            }
          });
          updatedDividedIds.add(item.dividedId);
          console.log(`Marked divided ${item.dividedId} as sold`);
        }
      }
    }
    console.log(`Updated dividedIds:`, Array.from(updatedDividedIds));
    console.log(`Updated stockIds:`, Array.from(updatedStockIds));

    // Format the shipment items to include more detailed information
    const formattedShipment = {
      ...shipment,
      customerName: order.customer?.name || "Unknown",
      customerAddress: order.customer?.address || "Unknown",
      customerPhone: order.customer?.phone || "Unknown",
      orderNo: order.orderNo,
      items: order.orderItems.map(item => ({
        ...item,
        scannedBarcodes: scannedItems
          .filter(si => si.orderItemId === item.id)
          .map(si => si.barcode)
      }))
    };

    return NextResponse.json({ 
      message: "Shipment processed successfully", 
      shipment: formattedShipment 
    });

  } catch (error) {
    console.error("Error processing shipment:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 