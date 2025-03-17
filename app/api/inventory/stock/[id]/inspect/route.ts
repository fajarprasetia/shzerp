import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!params?.id) {
    return NextResponse.json(
      { error: "Stock ID is required" },
      { status: 400 }
    );
  }

  try {
    const stock = await prisma.stock.update({
      where: { id: params.id },
      data: {
        inspected: true,
        inspectedAt: new Date(),
        // TODO: Add inspectedById when auth is implemented
      },
      include: {
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error inspecting stock:", error);
    return NextResponse.json(
      { error: "Error inspecting stock" },
      { status: 500 }
    );
  }
} 