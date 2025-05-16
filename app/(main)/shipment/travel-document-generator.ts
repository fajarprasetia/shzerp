import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Customer } from "@prisma/client";
import i18next from "i18next";

// Type for translation function
type TFunction = (key: string, fallback: string) => string;

interface ShipmentItem {
  id: string;
  productName: string;
  sku: string;
  barcode: string;
  barcodes?: string[]; // Array of all scanned barcodes
  quantity: number;
  type?: string;
  gsm?: number;
  width?: number;
  length?: number;
  weight?: number;
  identifierNumber?: string; // Added field to store jumbo roll or divided roll number
}

interface Shipment {
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  items: ShipmentItem[];
  createdAt: string;
  processedBy: {
    id: string;
    name: string;
  };
}

async function fetchCustomer(customerId: string): Promise<Customer> {
  const response = await fetch(`/api/customers/${customerId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch customer data');
  }
  return response.json();
}

export async function generateTravelDocumentPDF(
  shipment: Shipment, 
  t?: TFunction // Optional translation function
): Promise<ArrayBuffer> {
  // If no translation function is provided, use a fallback that just returns the fallback text
  const translate = t || ((key: string, fallback: string) => fallback);
  
  // Initialize PDF with A4 size in portrait orientation
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"  // A4 size (210 x 297 mm)
  });

  const pageWidth = 210;  // A4 width
  const pageHeight = 297; // A4 height
  const travelDocHeight = 148; // A5 height
  const maxItemsPerPage = 10; // More items per page since we don't have price columns
  const itemHeight = 6;

  // Split items into pages
  const chunks = [];
  for (let i = 0; i < shipment.items.length; i += maxItemsPerPage) {
    chunks.push(shipment.items.slice(i, i + maxItemsPerPage));
  }

  // Function to add header at specific Y position
  function addHeader(startY: number) {
    // Reset font
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Company Header - Left Side
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PT. SHUNHUI ZHIYE INDONESIA", 20, startY + 12);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Jl. Cibaligo No. 167, RT 001 RW 030, Desa Cibereum,", 20, startY + 16);
    doc.text("Kecamatan Cimahi Selatan, Kota Cimahi, Jawa Barat", 20, startY + 20);
    doc.text(translate('shipment.document.phone', 'Telepon: 0813-89-167167'), 20, startY + 24);

    // Travel Document Details - Right Side
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.title', 'SURAT JALAN'), pageWidth - 20, startY + 12, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${translate('shipment.document.orderNo', 'Order No')}: ${shipment.orderNo}`, pageWidth - 20, startY + 18, { align: "right" });
    doc.text(`${translate('shipment.document.shipmentId', 'Shipment ID')}: ${shipment.id}`, pageWidth - 20, startY + 22, { align: "right" });
    doc.text(`${translate('shipment.document.date', 'Date')}: ${format(new Date(shipment.createdAt), "dd MMMM yyyy", { locale: id })}`, pageWidth - 20, startY + 26, { align: "right" });

    // Customer Details - Right Side
    doc.text(translate('shipment.document.contactNo', 'No. Kontak:'), pageWidth - 70, startY + 32);
    doc.text(shipment.customerPhone ?? "-", pageWidth - 20, startY + 32, { align: "right" });
    doc.text(translate('shipment.document.pic', 'PIC:'), pageWidth - 70, startY + 36);
    doc.text(shipment.customerName ?? "-", pageWidth - 20, startY + 36, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.address', 'Alamat:'), pageWidth - 70, startY + 40);
    doc.setFont("helvetica", "normal");
    doc.text(shipment.address ?? "-", pageWidth - 20, startY + 44, { align: "right" });

    return startY + 48;
  }

  // Function to add table header at specific Y position
  function addTableHeader(startY: number) {
    // Table header row with improved styling
    doc.setFillColor(240, 240, 240);
    doc.rect(20, startY, 170, 8, "F");  // Make header slightly taller
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);  // Slightly larger font for headers
    doc.text(translate('shipment.document.product', 'Produk'), 25, startY + 5.5);
    doc.text(translate('shipment.document.specifications', 'Spesifikasi'), 65, startY + 5.5);
    doc.text(translate('shipment.document.skuBarcode', 'SKU/Barcode'), 150, startY + 5.5, { align: "center"});
    doc.text(translate('shipment.document.quantity', 'Quantity'), 177, startY + 5.5, { align: "center"});
    
    // Add a slightly thicker line below header
    doc.setLineWidth(0.5);
    doc.line(20, startY + 8, 190, startY + 8);
    doc.setLineWidth(0.3);  // Reset to default line width

    // Vertical lines with adjusted positions for better spacing
    doc.line(20, startY, 20, startY + 8);  // Start
    doc.line(60, startY, 60, startY + 8);  // After Produk
    doc.line(130, startY, 130, startY + 8); // After Spesifikasi
    doc.line(170, startY, 170, startY + 8); // After SKU/Barcode
    doc.line(190, startY, 190, startY + 8); // End

    return startY + 8;  // Return adjusted position
  }

  let currentY = 0;
  let currentHalf: 0 | 1 = 0; // 0 = top, 1 = bottom
  let currentPage = 0;
  doc.setFont("helvetica", "normal");
  let totalQty = 0;

  function startNewHalf(half: 0 | 1) {
    currentY = half === 0 ? 0 : travelDocHeight;
    let startY = addHeader(currentY);
    currentY = addTableHeader(startY);
    return currentY;
  }

  // Start with the top half of the first page
  currentY = startNewHalf(0);
  currentHalf = 0;
  currentPage = 0;
  let sectionStartY = currentY;
  let sectionEndY = currentY;

  chunks.forEach((items, chunkIndex) => {
    items.forEach((item) => {
      // Calculate all lines needed for SKU/Barcode
      let barcodeLines: string[] = [];
      if (item.identifierNumber) barcodeLines.push(item.identifierNumber);
      if (item.barcodes && item.barcodes.length > 0) {
        barcodeLines = barcodeLines.concat(item.barcodes);
      } else if (!item.identifierNumber) {
        barcodeLines.push(item.barcode || "-");
      }
      // Each barcode/identifier gets its own line
      // Calculate available space in current half
      let availableHeight = travelDocHeight - (currentY % travelDocHeight) - 40; // 40mm reserved for footer/signature
      const linesPerPage = Math.floor(availableHeight / 6);
      let lineIndex = 0;
      let firstRow = true;
      while (lineIndex < barcodeLines.length) {
        // If not first row, or not enough space, start a new half
        if (!firstRow || (currentY + 12 + (barcodeLines.length - lineIndex) * 6 + 40 > (currentHalf === 0 ? travelDocHeight : travelDocHeight * 2))) {
          // Draw vertical lines for the previous section
          doc.line(20, sectionStartY, 20, sectionEndY);
          doc.line(60, sectionStartY, 60, sectionEndY);
          doc.line(130, sectionStartY, 130, sectionEndY);
          doc.line(170, sectionStartY, 170, sectionEndY);
          doc.line(190, sectionStartY, 190, sectionEndY);
          // Switch to next half or new page
          if (currentHalf === 0) {
            currentHalf = 1;
          } else {
            doc.addPage();
            currentHalf = 0;
            currentPage++;
          }
          currentY = startNewHalf(currentHalf);
          sectionStartY = currentY;
        }
        // How many lines can we fit in this half?
        availableHeight = travelDocHeight - (currentY % travelDocHeight) - 40;
        const linesThisPage = Math.min(Math.floor(availableHeight / 6), barcodeLines.length - lineIndex);
        let rowHeight = Math.max(10, 5 + (linesThisPage * 5) + 2);
        // Product column
        doc.setFontSize(9);
        doc.text(item.productName || "-", 25, currentY + 5);
        doc.setFontSize(8);
        // Specifications column
        let specs = [];
        if (item.gsm) specs.push(`${item.gsm}g`);
        if (item.width) specs.push(`${item.width}mm`);
        if (item.length) specs.push(`${item.length}m`);
        if (item.weight) specs.push(`${item.weight}kg`);
        const specsText = specs.join(' × ');
        doc.text(specsText || "-", 65, currentY + 5);
        // SKU/Barcode column
        let barcodeY = currentY + 5;
        for (let i = 0; i < linesThisPage; i++) {
          if (item.identifierNumber && lineIndex === 0 && i === 0) {
            doc.setFont("helvetica", "bold");
            doc.text(barcodeLines[lineIndex + i], 150, barcodeY, { align: "center" });
            doc.setFont("helvetica", "normal");
          } else {
            doc.text(barcodeLines[lineIndex + i], 150, barcodeY, { align: "center" });
          }
          barcodeY += 5;
        }
        // Quantity column (only on first row for this item)
        if (firstRow) {
          doc.setFont("helvetica", "bold");
          doc.text(item.quantity.toString(), 177, currentY + 5);
          doc.setFont("helvetica", "normal");
        }
        // Row bottom line
        doc.line(20, currentY + rowHeight, 190, currentY + rowHeight);
        // Move to next row/section
        currentY += rowHeight;
        sectionEndY = currentY;
        lineIndex += linesThisPage;
        firstRow = false;
      }
      totalQty += item.quantity;
    });
    // Draw vertical lines for this section (after all items in chunk)
    doc.line(20, sectionStartY, 20, sectionEndY);
    doc.line(60, sectionStartY, 60, sectionEndY);
    doc.line(130, sectionStartY, 130, sectionEndY);
    doc.line(170, sectionStartY, 170, sectionEndY);
    doc.line(190, sectionStartY, 190, sectionEndY);
    // Add total quantity at the bottom
    doc.setFillColor(245, 245, 245);
    doc.rect(130, currentY + 5, 60, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.totalQuantity', 'Total Quantity:'), 140, currentY + 12);
    doc.text(totalQty.toString(), 177, currentY + 12);
    // Add shipping instructions
    currentY += 20;
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.shippingInstructions', 'PETUNJUK PENGIRIMAN:'), 20, currentY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(translate('shipment.document.instruction1', '1. Pastikan barang yang diterima sesuai dengan dokumen perjalanan ini.'), 20, currentY + 12);
    doc.text(translate('shipment.document.instruction2', '2. Periksa kondisi barang sebelum diterima untuk memastikan tidak ada kerusakan selama pengiriman.'), 20, currentY + 19);
    // Signature fields
    currentY += 35;
    doc.rect(25, currentY + 5, 50, 25);
    doc.rect(125, currentY + 5, 50, 25);
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.receiver', 'Penerima'), 40, currentY);
    doc.text(translate('shipment.document.sender', 'Pengirim'), 140, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(translate('shipment.document.date', 'Tanggal') + ': ________________', 25, currentY + 40);
    doc.text(translate('shipment.document.date', 'Tanggal') + ': ________________', 125, currentY + 40);
    // Prepare for next chunk: if not last, move to next half or page
    if (chunkIndex < chunks.length - 1) {
      if (currentHalf === 0) {
        currentHalf = 1;
        currentY = startNewHalf(1);
        sectionStartY = currentY;
      } else {
        doc.addPage();
        currentHalf = 0;
        currentY = startNewHalf(0);
        sectionStartY = currentY;
      }
    }
  });

  return doc.output('arraybuffer');
} 