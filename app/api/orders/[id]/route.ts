import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: params.id,
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

    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return new NextResponse("Error fetching order", { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const data = await req.json();
    const { items, ...orderData } = data;

    // First, delete existing order items
    await prisma.orderItem.deleteMany({
      where: {
        orderId: params.id,
      },
    });

    // Then update the order with new items
    const order = await prisma.order.update({
      where: {
        id: params.id,
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
        orderId: params.id,
      },
    });

    // Then delete the order
    await prisma.order.delete({
      where: {
        id: params.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting order:", error);
    return new NextResponse("Error deleting order", { status: 500 });
  }
} 