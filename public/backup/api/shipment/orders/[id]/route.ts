import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;
    
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
      where: { orderId: order.id },
    });

    if (existingShipment) {
      return NextResponse.json(
        { error: "Order is already shipped" },
        { status: 400 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[SHIPMENT_ORDER_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 