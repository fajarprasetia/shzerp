import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;

    const stock = await prisma.stock.update({
      where: { id: id },
      data: {
        inspected: true,
        inspectedAt: new Date(),
        inspectedById: session.user.id
      },
      include: {
        inspectedBy: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error("[STOCK_INSPECT_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 