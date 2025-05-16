import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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

    // Log the length change (real user if available)
    let userId = "system";
    let userName = "System";
    try {
      const session = await auth();
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (user) {
          userId = user.id;
          userName = user.name || "User";
        }
      }
    } catch {}
    await prisma.inspectionLog.create({
      data: {
        type: "divided_length_changed",
        itemType: "divided",
        itemIdentifier: divided.rollNo,
        userId,
        userName,
        note: `Length changed from ${existingDivided.length} to ${data.length}`,
        dividedId: id,
      }
    });

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
    const oldWidth = existingDivided.width;
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

    // Log the width change (real user if available)
    let userId = "system";
    let userName = "System";
    try {
      const session = await auth();
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (user) {
          userId = user.id;
          userName = user.name || "User";
        }
      }
    } catch {}
    await prisma.inspectionLog.create({
      data: {
        type: "divided_width_changed",
        itemType: "divided",
        itemIdentifier: updated.rollNo,
        userId,
        userName,
        note: `Width changed from ${oldWidth} to ${data.width}`,
        dividedId: id,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating divided width:", error);
    return NextResponse.json({ error: "Error updating divided width" }, { status: 500 });
  }
} 