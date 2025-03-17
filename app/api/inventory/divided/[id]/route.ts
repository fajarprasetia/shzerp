import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const divided = await prisma.divided.findUnique({
      where: { id: params.id },
      include: {
        stock: true,
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!divided) {
      return NextResponse.json({ error: "Divided stock not found" }, { status: 404 });
    }

    return NextResponse.json(divided);
  } catch (error) {
    console.error("Error fetching divided stock:", error);
    return NextResponse.json({ error: "Error fetching divided stock" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    // Check if divided stock exists
    const existingDivided = await prisma.divided.findUnique({
      where: { id: params.id },
      include: {
        stock: true,
      },
    });

    if (!existingDivided) {
      return NextResponse.json({ error: "Divided stock not found" }, { status: 404 });
    }

    // Calculate length difference
    const lengthDiff = data.length - existingDivided.length;

    // Check if parent stock has enough length
    if (lengthDiff > 0 && lengthDiff > existingDivided.stock.length) {
      return NextResponse.json({ error: "Not enough length in parent stock" }, { status: 400 });
    }

    // Update divided stock and parent stock in a transaction
    const [divided] = await prisma.$transaction([
      prisma.divided.update({
        where: {
          id: params.id,
        },
        data: {
          width: data.width,
          length: data.length,
          note: data.note,
        },
        include: {
          stock: true,
          inspectedBy: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.stock.update({
        where: {
          id: existingDivided.stockId,
        },
        data: {
          length: {
            decrement: lengthDiff,
          },
        },
      }),
    ]);

    return NextResponse.json(divided);
  } catch (error) {
    console.error("Error updating divided stock:", error);
    return NextResponse.json({ error: "Error updating divided stock" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get divided stock with parent stock
    const divided = await prisma.divided.findUnique({
      where: { id: params.id },
      include: {
        stock: true,
      },
    });

    if (!divided) {
      return NextResponse.json({ error: "Divided stock not found" }, { status: 404 });
    }

    // Delete divided stock and update parent stock in a transaction
    await prisma.$transaction([
      prisma.divided.delete({
        where: {
          id: params.id,
        },
      }),
      prisma.stock.update({
        where: {
          id: divided.stockId,
        },
        data: {
          length: {
            increment: divided.length,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting divided stock:", error);
    return NextResponse.json({ error: "Error deleting divided stock" }, { status: 500 });
  }
} 