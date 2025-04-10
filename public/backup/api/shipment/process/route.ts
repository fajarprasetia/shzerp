import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface ProcessShipmentRequest {
  orderId: string;
  shippedItems: {
    itemId: string;
    stockId?: string;
    dividedId?: string;
  }[];
  shipmentNotes?: string;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as ProcessShipmentRequest;
    const { orderId, shippedItems, shipmentNotes } = body;

    if (!orderId || !shippedItems || shippedItems.length === 0) {
      return NextResponse.json(
        { error: "Order ID and shipped items are required" },
        { status: 400 }
      );
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
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

    // Validate all shipped items belong to the order
    const orderItemIds = order.orderItems.map(item => item.id);
    const invalidItems = shippedItems.filter(item => !orderItemIds.includes(item.itemId));

    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: "Some items do not belong to this order", invalidItems },
        { status: 400 }
      );
    }

    // Create shipment record
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        shippedBy: session.user.id,
        shipmentDate: new Date(),
        notes: shipmentNotes || "",
        shipmentItems: {
          create: shippedItems.map(item => ({
            orderItemId: item.itemId,
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

    // For each shipped item, confirm isSold status on stock or divided stock
    for (const item of order.orderItems) {
      const isShipped = shippedItems.some(shippedItem => shippedItem.itemId === item.id);
      
      if (isShipped) {
        // Update stock item if exists
        if (item.stockId) {
          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              isSold: true,
              orderNo: order.orderNo,
              soldDate: new Date(),
              customerName: order.customer.name,
            },
          });
        }
        
        // Update divided item if exists
        if (item.dividedId) {
          await prisma.divided.update({
            where: { id: item.dividedId },
            data: {
              isSold: true,
              orderNo: order.orderNo,
              soldDate: new Date(),
              customerName: order.customer.name,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Shipment processed successfully",
      shipment,
    });

  } catch (error) {
    console.error("[PROCESS_SHIPMENT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 