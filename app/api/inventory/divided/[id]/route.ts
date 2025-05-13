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

    const divided = await prisma.divided.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    const data = await request.json();

    // Check if divided stock exists
    const existingDivided = await prisma.divided.findUnique({
      where: { id },
      include: {
        stock: true,
      },
    });

    if (!existingDivided) {
      return NextResponse.json({ error: "Divided stock not found" }, { status: 404 });
    }

    // Calculate length difference
    const lengthDiff = data.length - existingDivided.length;

    // Check if parent stock has enough remaining length for increase
    if (lengthDiff > 0 && lengthDiff > existingDivided.stock.remainingLength) {
      return NextResponse.json({ error: "Not enough remaining length in parent stock" }, { status: 400 });
    }

    // Update divided stock and parent stock in a transaction
    const [divided] = await prisma.$transaction([
      prisma.divided.update({
        where: {
          id,
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
          remainingLength: {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    // Get divided stock with parent stock
    const divided = await prisma.divided.findUnique({
      where: { id },
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
          id,
        },
      }),
      prisma.stock.update({
        where: {
          id: divided.stockId,
        },
        data: {
          remainingLength: {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    const data = await request.json();

    // Check if divided stock exists
    const existingDivided = await prisma.divided.findUnique({
      where: { id },
    });

    if (!existingDivided) {
      return NextResponse.json({ error: "Divided stock not found" }, { status: 404 });
    }

    // Validate width
    if (typeof data.width !== "number" || isNaN(data.width) || data.width <= 0) {
      return NextResponse.json({ error: "Invalid width value" }, { status: 400 });
    }

    // Update only the width
    const updated = await prisma.divided.update({
      where: { id },
      data: {
        width: data.width,
      },
      include: {
        stock: true,
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating divided width:", error);
    return NextResponse.json({ error: "Error updating divided width" }, { status: 500 });
  }
} 