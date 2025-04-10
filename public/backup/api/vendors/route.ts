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
      // Check if the Vendor table exists by attempting to count records
      const count = await prisma.vendor.count();
      
      // If we get here, the table exists, so fetch the vendors
      const vendors = await prisma.vendor.findMany({
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json(vendors);
    } catch (dbError) {
      // If the error is a PrismaClientKnownRequestError with code P2021, it means the table doesn't exist
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2021'
      ) {
        console.log("Vendors table doesn't exist yet, returning empty array");
        return NextResponse.json([]);
      }
      
      // For any other database error, log it and return an empty array
      console.error("Database error in vendors GET:", dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching vendors:", error);
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
    const { name, email, phone, address, taxId, notes } = body;

    // Validate required fields
    if (!name) {
      return new NextResponse("Vendor name is required", { status: 400 });
    }

    try {
      const vendor = await prisma.vendor.create({
        data: {
          name,
          email,
          phone,
          address,
          taxId,
          notes,
          isActive: true,
        },
      });

      return NextResponse.json(vendor);
    } catch (dbError) {
      console.error("Database error in vendors POST:", dbError);
      return new NextResponse("Database error: The vendors table may not exist yet", { status: 500 });
    }
  } catch (error) {
    console.error("Error creating vendor:", error);
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
    const { id, name, email, phone, address, taxId, notes, isActive } = body;

    if (!id) {
      return new NextResponse("Vendor ID is required", { status: 400 });
    }

    try {
      const vendor = await prisma.vendor.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          address,
          taxId,
          notes,
          isActive,
        },
      });

      return NextResponse.json(vendor);
    } catch (dbError) {
      console.error("Database error in vendors PATCH:", dbError);
      return new NextResponse("Database error: The vendor may not exist", { status: 500 });
    }
  } catch (error) {
    console.error("Error updating vendor:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Vendor ID is required", { status: 400 });
    }

    try {
      // Check if vendor has any bills
      const billCount = await prisma.vendorBill.count({
        where: { vendorId: id },
      });

      if (billCount > 0) {
        return new NextResponse(
          "Cannot delete vendor with existing bills. Consider deactivating instead.", 
          { status: 400 }
        );
      }

      const vendor = await prisma.vendor.delete({
        where: { id },
      });

      return NextResponse.json(vendor);
    } catch (dbError) {
      console.error("Database error in vendors DELETE:", dbError);
      return new NextResponse("Database error: The vendor may not exist", { status: 500 });
    }
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 