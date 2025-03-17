import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface OrderItem {
  type: string;
  product?: string;
  gsm?: number;
  width?: number;
  length?: number;
  weight?: number;
  quantity?: number;
  price: number;
  tax: number;
  stockId?: string;
  dividedId?: string;
}

interface CreateOrderRequest {
  customerId: string;
  orderItems: OrderItem[];
  note?: string;
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        orderItems: {
          include: {
            stock: true,
            divided: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Map orders to include the first order item's type
    const mappedOrders = orders.map(order => ({
      ...order,
      type: order.orderItems[0]?.type || "N/A"
    }));

    return NextResponse.json(mappedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Received order data:', body);

    // Validate required fields
    if (!body.customerId || !body.orderItems || body.orderItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = body.orderItems.reduce((sum: number, item: any) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const tax = Number(item.tax) || 0;
      const taxMultiplier = 1 + (tax / 100);

      let itemTotal = 0;
      if (item.type === "Sublimation Paper") {
        if (item.product === "Jumbo Roll") {
          const weight = Number(item.weight) || 0;
          itemTotal = price * weight;
        } else if (item.product === "Roll") {
          const width = Number(item.width) / 100; // Convert to meters
          const length = Number(item.length) || 0;
          itemTotal = price * width * length * quantity;
        }
      } else {
        itemTotal = price * quantity;
      }

      return sum + (itemTotal * taxMultiplier);
    }, 0);

    // Generate order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNo: {
          startsWith: `ORD-${dateStr}`,
        },
      },
      orderBy: {
        orderNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNo.split('-')[2]);
      sequence = lastSequence + 1;
    }
    const orderNo = `ORD-${dateStr}-${sequence.toString().padStart(3, '0')}`;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId: body.customerId,
        totalAmount, // Add the calculated total
        note: body.note,
        orderItems: {
          create: body.orderItems.map((item: any) => ({
            type: item.type,
            product: item.product,
            gsm: item.gsm,
            width: item.width,
            length: item.length,
            weight: item.weight,
            quantity: item.quantity || 1,
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

    // Update stock quantities
    for (const item of body.orderItems) {
      if (item.stockId) {
        await prisma.stock.update({
          where: { id: item.stockId },
          data: {
            remainingLength: {
              decrement: item.quantity || 1,
            },
          },
        });
      }
      if (item.dividedId) {
        await prisma.divided.update({
          where: { id: item.dividedId },
          data: {
            remainingLength: {
              decrement: item.quantity || 1,
            },
          },
        });
      }
    }

    console.log('Created order:', order);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    
    // Update the order
    const order = await prisma.order.update({
      where: {
        id: data.id
      },
      data: {
        customerId: data.customerId,
        note: data.note,
        orderItems: {
          deleteMany: {},
          create: data.orderItems.map((item: any) => ({
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
          }))
        }
      },
      include: {
        customer: true,
        orderItems: true,
      }
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to update order",
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    await prisma.order.delete({
      where: { id },
    });

    revalidatePath("/sales/orders");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
} 