import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get uninspected stock
    const uninspectedStock = await prisma.stock.findMany({
      where: {
        inspected: false
      },
      include: {
        inspectedBy: true
      }
    });

    // Get uninspected divided rolls
    const uninspectedDivided = await prisma.divided.findMany({
      where: {
        inspected: false
      },
      include: {
        stock: true,
        inspectedBy: true
      }
    });

    return NextResponse.json({
      stock: uninspectedStock,
      divided: uninspectedDivided
    });
  } catch (error) {
    console.error('Error fetching uninspected items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch uninspected items' },
      { status: 500 }
    );
  }
} 