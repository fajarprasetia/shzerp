import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    const stock = await prisma.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json({ error: "Error fetching stock" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    const data = await request.json();

    // Check if stock exists
    const existingStock = await prisma.stock.findUnique({
      where: { id },
    });

    if (!existingStock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const stock = await prisma.stock.update({
      where: {
        id,
      },
      data: {
        type: data.type,
        gsm: data.gsm,
        width: data.width,
        length: data.length,
        weight: data.weight,
        containerNo: data.containerNo,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
        note: data.note,
      },
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json({ error: "Error updating stock" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    await prisma.stock.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock:", error);
    return NextResponse.json({ error: "Error deleting stock" }, { status: 500 });
  }
}

// Add PATCH endpoint for updating just the remaining length
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    const data = await request.json();
    
    // Check if remainingLength is provided
    if (data.remainingLength === undefined) {
      return NextResponse.json(
        { error: "Remaining length is required" }, 
        { status: 400 }
      );
    }

    // Update only the remainingLength field
    const stock = await prisma.stock.update({
      where: { id },
      data: { 
        remainingLength: data.remainingLength,
        updatedAt: new Date()
      },
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error updating remaining length:", error);
    return NextResponse.json(
      { error: "Error updating remaining length" }, 
      { status: 500 }
    );
  }
} 