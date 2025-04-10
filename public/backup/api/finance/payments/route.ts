import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    // In development mode, bypass authentication
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Bypassing authentication for payments API");
    } else {
      // Only check authentication in production
      const session = await auth();
      if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const payments = await prisma.payment.findMany({
      include: {
        order: {
          select: {
            orderNo: true,
            customer: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    // Transform the payments to include formatted data
    const formattedPayments = payments.map(payment => {
      return {
        ...payment,
        // Add invoice number (orderNo) and customer name for easier display
        invoiceNo: payment.order?.orderNo || 'N/A',
        customerName: payment.order?.customer?.name || 'N/A',
        recordedBy: payment.user?.name || 'System',
        // Format the date for display
        formattedDate: payment.paymentDate.toLocaleDateString()
      };
    });

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("[PAYMENTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // In development mode, bypass authentication
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Bypassing authentication for payments API POST");
    } else {
      // Only check authentication in production
      const session = await auth();
      if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const body = await req.json();
    const { amount, paymentDate, paymentMethod, reference, notes, orderId } = body;

    // Validate required fields
    if (!amount || !paymentDate || !paymentMethod || !reference) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get current user
    const session = await auth();
    const userId = session?.user?.id;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        reference,
        notes,
        orderId: orderId || undefined, // Link to order if provided
        userId: userId || undefined, // Link to user if authenticated
      },
      include: {
        order: {
          select: {
            orderNo: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      ...payment,
      invoiceNo: payment.order?.orderNo || 'N/A',
      customerName: payment.order?.customer?.name || 'N/A'
    });
  } catch (error) {
    console.error("[PAYMENTS_POST]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal error",
      { status: 500 }
    );
  }
} 