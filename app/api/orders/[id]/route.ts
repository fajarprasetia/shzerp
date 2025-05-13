import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;

    const order = await prisma.order.findUnique({
      where: {
        id: id,
      },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const data = await req.json();
    const { items, ...orderData } = data;

    // First, delete existing order items
    await prisma.orderItem.deleteMany({
      where: {
        orderId: id,
      },
    });

    // Then update the order with new items
    const order = await prisma.order.update({
      where: {
        id: id,
      },
      data: {
        ...orderData,
        orderItems: {
          create: items,
        },
      },
      include: {
        customer: {
          select: {
            name: true,
            company: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            stockId: true,
            price: true,
            total: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return new NextResponse("Error updating order", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    // First delete all order items
    await prisma.orderItem.deleteMany({
      where: {
        orderId: id,
      },
    });

    // Then delete the order
    await prisma.order.delete({
      where: {
        id: id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting order:", error);
    return new NextResponse("Error deleting order", { status: 500 });
  }
} 