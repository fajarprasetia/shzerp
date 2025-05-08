import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface ScannedItem {
  orderItemId: string;
  barcode: string;
  stockId?: string | null;
  dividedId?: string | null;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderItems, scannedItems, shipmentNotes } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order has already been shipped
    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId },
    });

    if (existingShipment) {
      return NextResponse.json(
        { error: "This order has already been shipped" },
        { status: 400 }
      );
    }

    // Check if we have scanned items to process
    // First try the new format with explicit scannedItems array
    let itemsToProcess: ScannedItem[] = [];
    
    if (scannedItems && Array.isArray(scannedItems) && scannedItems.length > 0) {
      // Use the explicit scanned items array (new format)
      itemsToProcess = scannedItems;
    } else if (orderItems && Array.isArray(orderItems)) {
      // Fall back to deriving from orderItems with either scannedCount or scanned boolean
      // Look for items with scannedCount > 0 or scanned = true
      const processableItems = orderItems.filter(item => 
        (item.scannedCount && item.scannedCount > 0) || item.scanned
      );
      
      if (processableItems.length === 0) {
        return NextResponse.json(
          { error: "No items have been scanned for shipment" },
          { status: 400 }
        );
      }
      
      // Convert to the format needed for processing
      itemsToProcess = processableItems.map(item => ({
        orderItemId: item.id,
        barcode: item.barcodeId || item.rollNo || item.id, // Best effort to get a barcode
        stockId: item.stockId || null,
        dividedId: item.dividedId || null
      }));
    } else {
      return NextResponse.json(
        { error: "No valid items provided for shipment" },
        { status: 400 }
      );
    }
    
    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { error: "No items have been scanned for shipment" },
        { status: 400 }
      );
    }

    console.log("Processing shipment with items:", JSON.stringify(itemsToProcess));

    // Create the shipment record
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        shippedBy: session.user.id,
        shipmentDate: new Date(),
        notes: shipmentNotes || "",
        shipmentItems: {
          create: itemsToProcess.map(item => ({
            orderItemId: item.orderItemId,
            scannedBarcode: item.barcode,
            stockId: item.stockId,
            dividedId: item.dividedId
          })),
        },
      },
      include: {
        shipmentItems: true,
      },
    });

    // Update order status to "shipped"
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
      },
    });

    // Use Sets to avoid duplicate updates for stock and divided items
    const updatedStockIds = new Set<string>();
    const updatedDividedIds = new Set<string>();

    for (const item of itemsToProcess) {
      if (item.stockId && !updatedStockIds.has(item.stockId)) {
      // Find the original order item to get quantity
      const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
      const quantity = orderItem ? Number(orderItem.quantity) || 0 : 0;
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
              customerName: order.customer.name,
              remainingLength: {
                decrement: quantity
              }
            },
          });
          updatedStockIds.add(item.stockId);
          console.log(`Completed shipment: Marked stock ${item.stockId} as sold for order ${order.orderNo}`);
        } else {
          console.warn(`Stock item ${item.stockId} not found or already sold, skipping`);
        }
      }
      if (item.dividedId && !updatedDividedIds.has(item.dividedId)) {
        // Find the original order item to get quantity
        const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
        const quantity = orderItem ? Number(orderItem.quantity) || 0 : 0;
        // Check if divided item exists and is not already sold
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
              customerName: order.customer.name,
              remainingLength: {
                decrement: quantity
              }
            },
          });
          updatedDividedIds.add(item.dividedId);
          console.log(`Completed shipment: Marked divided stock ${item.dividedId} as sold for order ${order.orderNo}`);
        } else {
          console.warn(`Divided item ${item.dividedId} not found or already sold, skipping`);
        }
      }
    }
    console.log(`Updated dividedIds:`, Array.from(updatedDividedIds));
    console.log(`Updated stockIds:`, Array.from(updatedStockIds));

    return NextResponse.json({
      success: true,
      message: `Shipment completed successfully for order ${order.orderNo}`,
      shipment: {
        id: shipment.id,
        orderId: order.id,
        orderNo: order.orderNo
      },
    });

  } catch (error) {
    console.error("[COMPLETE_SHIPMENT]", error);
    return NextResponse.json({ 
      error: "Failed to complete shipment", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 