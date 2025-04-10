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
    doc.text(shipment.address ?? "-", pageWidth - 20, startY + 40, { align: "right" });

    return startY + 48;
  }

  // Function to add table header at specific Y position
  function addTableHeader(startY: number) {
    // Table header row
    doc.setFillColor(240, 240, 240);
    doc.rect(20, startY, 170, 6, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(translate('shipment.document.product', 'Produk'), 25, startY + 5);
    doc.text(translate('shipment.document.specifications', 'Spesifikasi'), 65, startY + 5);
    doc.text(translate('shipment.document.skuBarcode', 'SKU/Barcode'), 150, startY + 5, { align: "center"});
    doc.text(translate('shipment.document.quantity', 'Quantity'), 177, startY + 5, { align: "center"});
    doc.line(20, startY + 6, 190, startY + 6);

    // Vertical lines with adjusted positions for better spacing
    doc.line(20, startY, 20, startY + 6);  // Start
    doc.line(60, startY, 60, startY + 6);  // After Produk
    doc.line(130, startY, 130, startY + 6); // After Spesifikasi
    doc.line(170, startY, 170, startY + 6); // After SKU/Barcode
    doc.line(190, startY, 190, startY + 6); // End

    return startY + 6;
  }

  let currentY = 0;
  
  doc.setFont("helvetica", "normal");
  let totalQty = 0;

  chunks.forEach((items, pageIndex) => {
    // Calculate starting Y position for each invoice
    // If it's the second invoice on the page, start at the middle
    currentY = pageIndex % 2 === 0 ? 0 : travelDocHeight;
    
    let startY = addHeader(currentY);
    currentY = addTableHeader(startY);

    // Track vertical line start position for this table section
    const sectionStartY = currentY;
    let sectionEndY = currentY;

    items.forEach((item) => {
      let rowHeight = 10; // Default row height
      
      // Product column (Name)
      doc.text(item.productName || "-", 25, currentY + 5);

      // Specifications column (GSM, Width, Length, etc.)
      let specs = "";
      if (item.gsm) specs += `${item.gsm}g `;
      if (item.type) specs += `${item.type} `;
      if (item.width) specs += `${item.width}mm `;
      if (item.length) specs += `${item.length}m `;
      doc.text(specs.trim() || "-", 65, currentY + 5);

      // SKU/Barcode column
      // Check if we have an array of barcodes
      if (item.barcodes && item.barcodes.length > 0) {
        // First barcode shown normally
        doc.text(item.barcodes[0], 150, currentY + 5, { align: "center" });
        
        // If we have more barcodes, add them on additional lines
        if (item.barcodes.length > 1) {
          // Increase row height to accommodate additional barcodes
          // Each additional barcode needs about 5 points of space
          rowHeight = 5 + (item.barcodes.length * 5);
          
          // Add additional barcodes
          for (let i = 1; i < item.barcodes.length; i++) {
            doc.text(item.barcodes[i], 150, currentY + 5 + (i * 5), { align: "center"});
          }
        }
      } else {
        doc.text(item.barcode || "-", 150, currentY + 5, { align: "center" });
      }

      // Quantity column
      doc.text(item.quantity.toString(), 177, currentY + 5);
      
      // Add a horizontal line at the bottom of this row
      doc.line(20, currentY + rowHeight, 190, currentY + rowHeight);
      
      // Move to next row
      currentY += rowHeight;
      sectionEndY = currentY;
      
      totalQty += item.quantity;
    });
    
    // Now draw the vertical lines that span the entire section
    doc.line(20, sectionStartY, 20, sectionEndY);  // Start
    doc.line(60, sectionStartY, 60, sectionEndY);  // After Produk
    doc.line(130, sectionStartY, 130, sectionEndY); // After Spesifikasi
    doc.line(170, sectionStartY, 170, sectionEndY); // After SKU/Barcode
    doc.line(190, sectionStartY, 190, sectionEndY); // End

    // Add total quantity at the bottom
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.totalQuantity', 'Total Quantity:'), 140, currentY + 10);
    doc.text(totalQty.toString(), 177, currentY + 10);

    // Add shipping instructions
    currentY += 15;
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.shippingInstructions', 'PETUNJUK PENGIRIMAN:'), 20, currentY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(translate('shipment.document.instruction1', '1. Pastikan barang yang diterima sesuai dengan dokumen perjalanan ini.'), 20, currentY + 12);
    doc.text(translate('shipment.document.instruction2', '2. Periksa kondisi barang sebelum diterima untuk memastikan tidak ada kerusakan selama pengiriman.'), 20, currentY + 19);
    
    // Signature fields
    currentY += 35;
    
    doc.setFont("helvetica", "bold");
    doc.text(translate('shipment.document.receiver', 'Penerima'), 40, currentY);
    doc.text(translate('shipment.document.sender', 'Pengirim'), 140, currentY);
    
    // Add new page if there are more items and this isn't the last chunk
    if (pageIndex < chunks.length - 1 && pageIndex % 2 === 1) {
      doc.addPage();
    }
  });

  return doc.output('arraybuffer');
} 