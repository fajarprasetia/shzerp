import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        customer: true,
        divided: {
          include: {
            stock: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Header
    page.drawText("INVOICE", {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
    });

    // Company Info
    page.drawText("SHZ ERP System", {
      x: 50,
      y: height - 100,
      size: 12,
      font: boldFont,
    });

    // Invoice Details
    page.drawText(`Invoice No: ${order.invoiceNo}`, {
      x: width - 200,
      y: height - 50,
      size: 12,
      font: font,
    });

    page.drawText(`Date: ${formatDate(order.createdAt)}`, {
      x: width - 200,
      y: height - 70,
      size: 12,
      font: font,
    });

    // Customer Details
    page.drawText("Bill To:", {
      x: 50,
      y: height - 150,
      size: 12,
      font: boldFont,
    });

    page.drawText(order.customer.name, {
      x: 50,
      y: height - 170,
      size: 12,
      font: font,
    });

    if (order.customer.address) {
      page.drawText(order.customer.address, {
        x: 50,
        y: height - 190,
        size: 12,
        font: font,
      });
    }

    // Order Details Table
    const tableTop = height - 250;
    const lineHeight = 20;
    let currentY = tableTop;

    // Table Headers
    const columns = [
      { x: 50, width: 200, header: "Description" },
      { x: 250, width: 80, header: "Quantity" },
      { x: 330, width: 100, header: "Price" },
      { x: 430, width: 100, header: "Total" },
    ];

    // Draw table headers
    columns.forEach((column) => {
      page.drawText(column.header, {
        x: column.x,
        y: currentY,
        size: 12,
        font: boldFont,
      });
    });

    currentY -= lineHeight;

    // Draw horizontal line
    page.drawLine({
      start: { x: 50, y: currentY + 5 },
      end: { x: width - 50, y: currentY + 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    currentY -= lineHeight;

    // Draw order item
    page.drawText(`${order.divided.stock.type} - ${order.divided.rollNo}`, {
      x: columns[0].x,
      y: currentY,
      size: 12,
      font: font,
    });

    page.drawText(order.quantity.toString(), {
      x: columns[1].x,
      y: currentY,
      size: 12,
      font: font,
    });

    page.drawText(formatCurrency(order.price), {
      x: columns[2].x,
      y: currentY,
      size: 12,
      font: font,
    });

    page.drawText(formatCurrency(order.price * order.quantity), {
      x: columns[3].x,
      y: currentY,
      size: 12,
      font: font,
    });

    currentY -= lineHeight * 2;

    // Draw totals
    page.drawText("Subtotal:", {
      x: columns[2].x,
      y: currentY,
      size: 12,
      font: boldFont,
    });

    page.drawText(formatCurrency(order.price * order.quantity), {
      x: columns[3].x,
      y: currentY,
      size: 12,
      font: font,
    });

    currentY -= lineHeight;

    page.drawText("Tax:", {
      x: columns[2].x,
      y: currentY,
      size: 12,
      font: boldFont,
    });

    page.drawText(formatCurrency(order.tax), {
      x: columns[3].x,
      y: currentY,
      size: 12,
      font: font,
    });

    currentY -= lineHeight;

    page.drawText("Total:", {
      x: columns[2].x,
      y: currentY,
      size: 12,
      font: boldFont,
    });

    page.drawText(formatCurrency(order.total), {
      x: columns[3].x,
      y: currentY,
      size: 12,
      font: font,
    });

    // Footer
    page.drawText("Thank you for your business!", {
      x: 50,
      y: 50,
      size: 12,
      font: font,
    });

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${order.invoiceNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Error generating invoice" },
      { status: 500 }
    );
  }
}
 