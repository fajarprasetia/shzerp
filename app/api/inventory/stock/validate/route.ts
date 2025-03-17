import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.findUnique({
      where: { barcodeId: barcode }
    });

    if (!stock) {
      return NextResponse.json(
        { error: "Stock not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error validating stock:', error);
    return NextResponse.json(
      { error: 'Failed to validate stock' },
      { status: 500 }
    );
  }
} 