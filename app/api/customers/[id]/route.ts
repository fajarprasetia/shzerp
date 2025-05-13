import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    console.log(`Fetching customer with ID: ${id}`);
    
    const customer = await prisma.customer.findUnique({
      where: {
        id
      }
    });

    if (!customer) {
      console.log(`Customer with ID ${id} not found`);
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    console.log(`Successfully retrieved customer: ${customer.name}`);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("[CUSTOMER_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const data = await req.json();
    
    const customer = await prisma.customer.update({
      where: {
        id,
      },
      data,
    });
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Error updating customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    
    await prisma.customer.delete({
      where: {
        id,
      },
    });
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Error deleting customer" },
      { status: 500 }
    );
  }
} 