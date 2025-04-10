import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stock = await prisma.stock.findMany({
      where: {
        inspected: false,
      },
      include: {
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error fetching uninspected stock:", error);
    return NextResponse.json(
      { error: "Error fetching uninspected stock" },
      { status: 500 }
    );
  }
} 