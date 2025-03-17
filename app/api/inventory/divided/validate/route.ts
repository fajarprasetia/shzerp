import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcodeId = searchParams.get("barcodeId");

    if (!barcodeId) {
      return NextResponse.json(
        { error: "Barcode ID is required" },
        { status: 400 }
      );
    }

    const divided = await prisma.divided.findUnique({
      where: { barcodeId },
      include: {
        stock: true,
        inspectedBy: true,
      },
    });

    if (!divided) {
      return NextResponse.json(
        { error: "Divided stock not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(divided);
  } catch (error) {
    console.error("Error validating divided stock barcode:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
 