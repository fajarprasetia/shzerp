import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const stock = await prisma.stock.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    // Check if stock exists
    const existingStock = await prisma.stock.findUnique({
      where: { id: params.id },
    });

    if (!existingStock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const stock = await prisma.stock.update({
      where: {
        id: params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    await prisma.stock.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock:", error);
    return NextResponse.json({ error: "Error deleting stock" }, { status: 500 });
  }
} 