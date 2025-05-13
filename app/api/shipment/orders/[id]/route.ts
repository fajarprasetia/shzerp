import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const orderId = unwrappedParams.id;
    
    // Fetch order with customer and orderItems
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            type: true,
            product: true,
            gsm: true,
            width: true,
            length: true,
            weight: true,
            quantity: true,
            stockId: true,
            dividedId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if the order is already shipped
    const existingShipment = await prisma.shipment.findFirst({
      where: { 
        orderId: order.id,
        status: "COMPLETED" // Only consider completed shipments
      },
    });

    if (existingShipment) {
      return NextResponse.json(
        { 
          error: "Order is already shipped",
          shipmentId: existingShipment.id,
          shipmentDate: existingShipment.shipmentDate
        },
        { status: 400 }
      );
    }

    // Check for in-progress shipments
    const inProgressShipment = await prisma.shipment.findFirst({
      where: {
        orderId: order.id,
        status: "IN_PROGRESS"
      },
      include: {
        shipmentItems: true
      }
    });

    // Return the order with additional shipment information if available
    return NextResponse.json({
      ...order,
      inProgressShipment: inProgressShipment ? {
        id: inProgressShipment.id,
        itemCount: inProgressShipment.shipmentItems.length
      } : null
    });
  } catch (error) {
    console.error("[SHIPMENT_ORDER_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 