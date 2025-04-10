import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
      // Check if the VendorBill table exists by attempting to count records
      const count = await prisma.vendorBill.count();
      
      // If we get here, the table exists, so fetch the bills
      const bills = await prisma.vendorBill.findMany({
        include: {
          vendor: true,
        },
        orderBy: {
          billDate: "desc",
        },
      });

      return NextResponse.json(
        bills.map((bill) => ({
          ...bill,
          vendorName: bill.vendor.name,
        }))
      );
    } catch (dbError) {
      // If the error is a PrismaClientKnownRequestError with code P2021, it means the table doesn't exist
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2021'
      ) {
        console.log("Vendor bills table doesn't exist yet, returning empty array");
        return NextResponse.json([]);
      }
      
      // For any other database error, log it and return an empty array
      console.error("Database error in vendor-bills GET:", dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching vendor bills:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { vendorId, amount, billDate, dueDate, notes } = body;

    // Validate required fields
    if (!vendorId || !amount || !billDate || !dueDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    try {
      // Generate a unique bill number
      const billNo = `VB-${Date.now()}`;

      const bill = await prisma.vendorBill.create({
        data: {
          billNo,
          vendorId,
          amount: parseFloat(amount),
          billDate: new Date(billDate),
          dueDate: new Date(dueDate),
          notes,
          status: "pending"
        },
        include: {
          vendor: true,
        },
      });

      return NextResponse.json({
        ...bill,
        vendorName: bill.vendor.name,
      });
    } catch (dbError) {
      console.error("Database error in vendor-bills POST:", dbError);
      return new NextResponse("Database error: The vendor bills table may not exist yet", { status: 500 });
    }
  } catch (error) {
    console.error("Error creating vendor bill:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    try {
      const bill = await prisma.vendorBill.update({
        where: { id },
        data: { status },
        include: {
          vendor: true,
        },
      });

      return NextResponse.json({
        ...bill,
        vendorName: bill.vendor.name,
      });
    } catch (dbError) {
      console.error("Database error in vendor-bills PATCH:", dbError);
      return new NextResponse("Database error: The vendor bills table may not exist yet", { status: 500 });
    }
  } catch (error) {
    console.error("Error updating vendor bill:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 