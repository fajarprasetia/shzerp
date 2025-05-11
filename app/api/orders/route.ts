import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          select: {
            name: true,
            address: true,
          },
        },
        orderItems: true,
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            reference: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc"
          },
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the orders to include payment information
    const transformedOrders = orders.map(order => {
      // Check if there are any approved payments
      const hasApprovedPayment = order.payments.some(payment => 
        payment.status === "approved" || payment.status === "COMPLETED"
      );
      
      // Get the payment with an image reference (if any)
      const paymentWithImage = order.payments.find(payment => 
        payment.reference && (
          payment.reference.startsWith('/images/') || 
          payment.reference.startsWith('/uploads/')
        )
      );
      
      return {
        ...order,
        // Add payment reference if available
        reference: paymentWithImage?.reference,
        // Mark as paid if there's an approved payment
        paymentStatus: hasApprovedPayment ? "paid" : "unpaid",
        // Remove the payments array to keep the response clean
        payments: undefined
      };
    });

    return NextResponse.json(transformedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error fetching orders", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, orderItems, note, totalAmount, discount } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json({ error: "At least one order item is required" }, { status: 400 });
    }

    // Create the order with its items
    const order = await prisma.order.create({
      data: {
        customerId,
        note,
        totalAmount,
        discount: discount || 0,
        orderItems: {
          create: orderItems.map(item => ({
            type: item.type,
            product: item.product,
            gsm: item.gsm,
            width: item.width,
            length: item.length,
            weight: item.weight,
            quantity: item.quantity,
            price: item.price,
            tax: item.tax,
            stockId: item.productId, // Map productId back to stockId for the database
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
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Error creating order", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 