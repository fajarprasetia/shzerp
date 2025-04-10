import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Divided stock ID is required" },
        { status: 400 }
      );
    }

    const divided = await prisma.divided.findUnique({
      where: { id },
      include: { stock: true },
    });

    if (!divided) {
      return NextResponse.json(
        { error: "Divided stock not found" },
        { status: 404 }
      );
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([200, 140]); // 7cm x 5cm at 72 DPI
    const { width, height } = page.getSize();

    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(divided.barcodeId, {
      width: 100,
      margin: 0,
    });
    const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);
    const qrCodeDims = qrCodeImage.scale(0.5);

    // Draw QR code
    page.drawImage(qrCodeImage, {
      x: 10,
      y: height - qrCodeDims.height - 10,
      width: qrCodeDims.width,
      height: qrCodeDims.height,
    });

    // Draw text information
    const fontSize = 8;
    const lineHeight = fontSize * 1.2;
    let currentY = height - 20;

    // Draw company name
    page.drawText("SHZ ERP", {
      x: qrCodeDims.width + 20,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    currentY -= lineHeight * 2;

    // Draw stock information
    const info = [
      `ID: ${divided.barcodeId}`,
      `Type: ${divided.stock.type}`,
      `GSM: ${divided.stock.gsm}`,
      `Width: ${divided.width}`,
      `Length: ${divided.length}`,
      `Weight: ${divided.weight}`,
    ];

    info.forEach((text) => {
      page.drawText(text, {
        x: qrCodeDims.width + 20,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    });

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sticker-${divided.barcodeId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating sticker:", error);
    return NextResponse.json(
      { error: "Error generating sticker" },
      { status: 500 }
    );
  }
} 