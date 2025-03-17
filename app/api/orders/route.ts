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