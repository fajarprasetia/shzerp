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
    const { customerId, orderItems, note } = body;

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        customerId,
        note,
        orderItems: {
          deleteMany: {},
          create: orderItems.map((item: any) => ({
            type: item.type,
            product: item.product,
            gsm: item.gsm,
            width: item.width,
            length: item.length,
            weight: item.weight,
            quantity: item.quantity,
            price: item.price,
            tax: item.tax,
            stockId: item.stockId,
            dividedId: item.dividedId,
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
    return new NextResponse("Internal error", { status: 500 });
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