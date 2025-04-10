import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        orderItems: {
          include: {
            stock: true,
            divided: true,
          },
        },
      },
    });

    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { customerId, orderItems, note, totalAmount } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json({ error: "At least one order item is required" }, { status: 400 });
    }

    // Validate each order item
    for (const item of orderItems) {
      if (!item.type || !item.quantity || !item.price) {
        return NextResponse.json({ 
          error: "Each order item must have type, quantity, and price",
          details: item
        }, { status: 400 });
      }

      // Ensure numeric values are valid
      if (isNaN(Number(item.quantity)) || isNaN(Number(item.price)) || isNaN(Number(item.tax))) {
        return NextResponse.json({ 
          error: "Invalid numeric values in order item",
          details: item
        }, { status: 400 });
      }
    }

    // Validate totalAmount
    if (totalAmount !== undefined && isNaN(Number(totalAmount))) {
      return NextResponse.json({ error: "Invalid total amount" }, { status: 400 });
    }

    // First, check if the order exists and has any shipment items
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        orderItems: {
          include: {
            shipmentItems: true
          }
        }
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if any order items have associated shipment items
    const hasShipmentItems = existingOrder.orderItems.some(item => item.shipmentItems.length > 0);
    
    if (hasShipmentItems) {
      return NextResponse.json({ 
        error: "Cannot update order that has been shipped. Please create a new order instead.",
        details: "Order items are referenced by shipment items"
      }, { status: 400 });
    }

    // If we get here, we can safely update the order
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        customerId,
        note: note || null,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        orderItems: {
          deleteMany: {},
          create: orderItems.map((item: any) => ({
            type: item.type,
            product: item.product || null,
            gsm: item.gsm || null,
            width: item.width || null,
            length: item.length || null,
            weight: item.weight || null,
            quantity: Number(item.quantity),
            price: Number(item.price),
            tax: Number(item.tax || 0),
            stockId: item.stockId || null,
            dividedId: item.dividedId || null,
          })),
        },
      },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_PUT]", error);
    return NextResponse.json(
      { 
        error: "Failed to update order",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.order.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ORDER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 