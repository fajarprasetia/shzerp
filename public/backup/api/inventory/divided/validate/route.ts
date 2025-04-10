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

    // Find the stock by barcode
    const stock = await prisma.stock.findFirst({
      where: { 
        barcodeId: barcode,
        type: "Jumbo Roll"
      },
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
        { error: "No valid Jumbo Roll found with the provided barcode", success: false },
        { status: 404 }
      );
    }

    if (!stock.inspected) {
      return NextResponse.json(
        { error: "This stock has not been inspected yet", success: false },
        { status: 400 }
      );
    }

    if (stock.remainingLength <= 0) {
      return NextResponse.json(
        { error: "This stock has no remaining length available", success: false },
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
 