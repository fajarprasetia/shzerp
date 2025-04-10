import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

interface VendorPayment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  status: string;
  reference?: string;
  bill?: {
    billNo: string;
    vendor: {
      name: string;
    };
  };
  billNo?: string;
  vendorName?: string;
}

interface Payment {
  amount: number;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
      // Check if the VendorPayment table exists by attempting to count records
      const count = await prisma.vendorPayment.count();
      
      // If we get here, the table exists, so fetch the payments
      const payments = await prisma.vendorPayment.findMany({
        include: {
          bill: {
            include: {
              vendor: true,
            },
          },
        },
        orderBy: {
          paymentDate: "desc",
        },
      });

      return NextResponse.json(
        payments.map((payment: VendorPayment) => ({
          ...payment,
          billNo: payment.bill?.billNo,
          vendorName: payment.bill?.vendor.name,
        }))
      );
    } catch (dbError) {
      // If the error is a PrismaClientKnownRequestError with code P2021, it means the table doesn't exist
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2021'
      ) {
        console.log("Vendor payments table doesn't exist yet, returning empty array");
        return NextResponse.json([]);
      }
      
      // For any other database error, log it and return an empty array
      console.error("Database error in vendor-payments GET:", dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching vendor payments:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { billId, amount, paymentDate, paymentMethod, reference } = body;

    // Validate required fields
    if (!billId || !amount || !paymentDate || !paymentMethod) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    try {
      // Check if bill exists
      const bill = await prisma.vendorBill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        return new NextResponse("Bill not found", { status: 404 });
      }

      // Create payment
      const payment = await prisma.vendorPayment.create({
        data: {
          billId,
          amount: parseFloat(amount),
          paymentDate: new Date(paymentDate),
          paymentMethod,
          reference,
          status: "completed",
          userId: session.user.id,
        },
        include: {
          bill: {
            include: {
              vendor: true,
            },
          },
        },
      });

      // Update bill status if fully paid
      const payments = await prisma.vendorPayment.findMany({
        where: { billId },
      });

      const totalPaid = payments.reduce(
        (sum: number, p: Payment) => sum + p.amount,
        0
      );

      if (totalPaid >= bill.amount) {
        await prisma.vendorBill.update({
          where: { id: billId },
          data: { status: "paid" },
        });
      }

      return NextResponse.json({
        ...payment,
        billNo: payment.bill?.billNo,
        vendorName: payment.bill?.vendor.name,
      });
    } catch (dbError) {
      console.error("Database error in vendor-payments POST:", dbError);
      return new NextResponse("Database error: The vendor payments table may not exist yet", { status: 500 });
    }
  } catch (error) {
    console.error("Error creating vendor payment:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 