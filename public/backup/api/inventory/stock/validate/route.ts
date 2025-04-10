import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode") || searchParams.get("barcodeId");

    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode is required", success: false },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.findUnique({
      where: { barcodeId: barcode },
      include: {
        inspectedBy: {
          select: {
            name: true
          }
        }
      }
    });

    if (!stock) {
      return NextResponse.json(
        { error: "Stock not found with the provided barcode", success: false },
        { status: 404 }
      );
    }

    // Check if the stock has been inspected
    if (!stock.inspected) {
      return NextResponse.json(
        { 
          error: "This stock has not been inspected yet", 
          stock,
          success: false 
        },
        { status: 400 }
      );
    }

    // Check if stock has enough remaining length
    if (stock.remainingLength <= 0) {
      return NextResponse.json(
        { 
          error: "This stock has no remaining length available", 
          stock,
          success: false 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...stock,
      success: true
    });
  } catch (error) {
    console.error('Error validating stock:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to validate stock', 
        success: false 
      },
      { status: 500 }
    );
  }
} 