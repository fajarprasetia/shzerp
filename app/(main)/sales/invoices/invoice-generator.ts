import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Customer } from "@prisma/client";

interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  tax: number;
  total: number;
  type: string;
  product?: string;
  gsm?: number;
  width?: number;
  length?: number;
  weight?: number;
  stock?: {
    gsm: number;
    width: number;
    type: string;
    length?: number;
    weight?: number;
  } | null;
  divided?: {
    gsm: number;
    width: number;
    type: string;
    length?: number;
    weight?: number;
  } | null;
}

interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  orderItems: OrderItem[];
  totalAmount: number;
  discount: number;
  createdAt: Date;
}

async function fetchCustomer(customerId: string): Promise<Customer> {
  const response = await fetch(`/api/customers/${customerId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch customer data');
  }
  return response.json();
}

function calculateItemTotal(item: OrderItem): number {
  if (!item) return 0;
  
  // Ensure we have numeric values
  const price = Number(item.price) || 0;
  const tax = Number(item.tax) || 0;
  const taxMultiplier = 1 + (tax / 100);
  const quantity = Number(item.quantity) || 1;

  let subtotal = 0;

  // Default to price * quantity if type is missing
  if (!item.type) {
    console.warn(`Item ${item.id} missing type, using default calculation`);
    return price * quantity * taxMultiplier;
  }

  switch (item.type) {
    case "Sublimation Paper":
      if (item.product === "Jumbo Roll") {
        const weight = Number(item.weight) || 
          (item.stock?.weight ? Number(item.stock.weight) : 0);
        
        if (weight > 0) {
          subtotal = price * weight;
        } else {
          subtotal = price * quantity;
        }
      } else if (item.product === "Roll") {
        const width = Number(item.width || item.stock?.width) / 100; // Convert to meters
        const length = Number(item.length || item.stock?.length) || 0;
        
        if (width > 0 && length > 0) {
          subtotal = price * width * length * quantity;
        } else {
          subtotal = price * quantity;
        }
      } else {
        // Default calculation if product is missing
        subtotal = price * quantity;
      }
      break;

    case "Protect Paper":
      const protectWeight = Number(item.weight || item.stock?.weight) || 0;
      if (protectWeight > 0) {
        subtotal = price * protectWeight;
      } else {
        subtotal = price * quantity;
      }
      break;

    case "DTF Film":
    case "Ink":
    default:
      // Default for any other types
      subtotal = price * quantity;
      break;
  }

  return subtotal * taxMultiplier;
}

export async function generateInvoicePDF(order: Order): Promise<ArrayBuffer> {
  console.log('Starting PDF generation with order:', {
    id: order.id,
    orderNo: order.orderNo,
    customerId: order.customerId,
    discount: order.discount,
    totalAmount: order.totalAmount,
    itemCount: Array.isArray(order.orderItems) ? order.orderItems.length : 'not an array',
    items: Array.isArray(order.orderItems) ? order.orderItems.map(item => ({
      id: item.id,
      type: item.type,
      product: item.product,
      price: item.price,
      quantity: item.quantity,
      tax: item.tax,
      gsm: item.gsm,
      width: item.width,
      length: item.length,
      weight: item.weight
    })) : 'No items'
  });

  // Ensure orderItems is an array
  if (!order.orderItems) {
    console.error('orderItems is not defined in the order');
    order.orderItems = [];
  } else if (!Array.isArray(order.orderItems)) {
    console.error('orderItems is not an array:', order.orderItems);
    order.orderItems = [];
  }

  // Check if we have order items
  if (order.orderItems.length === 0) {
    console.error('No order items to generate PDF. Creating a simple PDF with just the header.');
    
    // Instead of throwing an error, we'll create a simple PDF with just the header
    // and a message indicating there are no items

    // Fetch customer data from API
    const customer = await fetchCustomer(order.customerId);
    console.log('Fetched customer data:', customer);

    // Initialize PDF with A4 size in portrait orientation
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"  // A4 size (210 x 297 mm)
    });

    const pageWidth = 210;  // A4 width
    
    // Add header
    let currentY = 0;
    let startY = addHeader(currentY, doc, order, customer, pageWidth);
    currentY = addTableHeader(startY, doc, pageWidth);
    
    // Add "No items" message
    doc.setFont("helvetica", "italic");
    doc.text("No items found for this invoice", 105, currentY + 10, { align: "center" });
    
    // Add total amount
    currentY += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 157, currentY + 5);
    doc.text(formatCurrency(order.totalAmount).replace("Rp", "").trim(), 172, currentY + 5);
    
    console.log('PDF generation completed with no items');
    return doc.output('arraybuffer');
  }

  // Ensure all order items have the required properties
  const validatedItems = order.orderItems.map(item => {
    // Make sure there's a type
    if (!item.type) {
      console.warn(`Item ${item.id} missing type, using stock or divided type`);
      item.type = item.stock?.type || item.divided?.type || "Unknown";
    }
    
    // Make sure there's a product
    if (!item.product) {
      console.warn(`Item ${item.id} missing product, determining from type`);
      item.product = item.type === "Sublimation Paper" ? 
        (item.stock?.weight || item.weight ? "Jumbo Roll" : "Roll") : 
        item.type;
    }
    
    return item;
  });
  
  // Replace order items with validated items
  order.orderItems = validatedItems;

  // Fetch customer data from API
  const customer = await fetchCustomer(order.customerId);
  console.log('Fetched customer data:', customer);

  // Initialize PDF with A4 size in portrait orientation
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"  // A4 size (210 x 297 mm)
  });

  const pageWidth = 210;  // A4 width
  const pageHeight = 297; // A4 height
  const invoiceHeight = 148; // A5 height
  const maxItemsPerPage = 5;
  const itemHeight = 6;

  // Split items into pages
  const chunks = [];
  for (let i = 0; i < order.orderItems.length; i += maxItemsPerPage) {
    chunks.push(order.orderItems.slice(i, i + maxItemsPerPage));
  }

  console.log('Split order items into chunks:', {
    totalItems: order.orderItems.length,
    chunkCount: chunks.length,
    itemsPerChunk: chunks.map(chunk => chunk.length)
  });

  let currentY = 0;
  
  doc.setFont("helvetica", "normal");
  let totalQty = 0;
  let totalTax = 0;

  chunks.forEach((items, pageIndex) => {
    console.log(`Processing chunk ${pageIndex + 1} of ${chunks.length}`);
    
    // Calculate starting Y position for each invoice
    // If it's the second invoice on the page, start at the middle
    currentY = pageIndex % 2 === 0 ? 0 : invoiceHeight;
    
    let startY = addHeader(currentY, doc, order, customer, pageWidth);
    currentY = addTableHeader(startY, doc, pageWidth);

    items.forEach((item, itemIndex) => {
      console.log(`Processing item ${itemIndex + 1} in chunk ${pageIndex + 1}:`, {
        type: item.type,
        product: item.product,
        gsm: item.gsm,
        width: item.width,
        length: item.length,
        weight: item.weight,
        price: item.price,
        quantity: item.quantity,
        tax: item.tax
      });

      if (!item.type) {
        console.warn('Skipping item due to missing type');
        return;
      }

      const product = item.stock || item.divided;
      
      // Produk column: always use item.type, item.product, item.gsm from OrderItem, never show 'Unknown'
      let produkText = (item.type && item.type !== 'Unknown') ? item.type : '-';
      if (item.product && item.product !== '-') {
        produkText += ` ${item.product}`;
      }
      const gsmStr = item.gsm ? String(item.gsm) : '';
      if (gsmStr && gsmStr !== '-' && gsmStr !== 'Unknown' && gsmStr !== '0') {
        produkText += ` ${gsmStr}gsm`;
      }
      doc.text(produkText, 22, currentY + 5);

      // Tipe column (Width x Length or just Width)
      let width = "N/A";
      let length = "";
      if (item.width !== undefined && item.width !== null) {
        width = item.width.toString();
      } else if (item.stock?.width !== undefined && item.stock?.width !== null) {
        width = item.stock.width.toString();
      } else if (item.divided?.width !== undefined && item.divided?.width !== null) {
        width = item.divided.width.toString();
      }
      if (item.product !== "Jumbo Roll") {
        if (item.length !== undefined && item.length !== null) {
          length = ` x ${item.length}`;
        } else if (item.stock?.length !== undefined && item.stock?.length !== null) {
          length = ` x ${item.stock.length}`;
        } else if (item.divided?.length !== undefined && item.divided?.length !== null) {
          length = ` x ${item.divided.length}`;
        }
      }
      doc.text(`${width}${length}`, 72, currentY + 5);

      // Quantity column
      let qtyText = "N/A";
      if (item.product === "Jumbo Roll") {
        const weight = product?.weight || item.weight;
        qtyText = weight ? `${weight} kg` : "N/A";
      } else {
        qtyText = item.quantity ? `${item.quantity} Roll` : "N/A";
      }
      doc.text(qtyText, 97, currentY + 5);

      // Price, Tax, and Amount
      doc.text(formatCurrency(item.price).replace("Rp", "").trim(), 117, currentY + 5);
      doc.text(item.tax.toString(), 142, currentY + 5);
      const itemTotal = calculateItemTotal(item);
      doc.text(formatCurrency(itemTotal).replace("Rp", "").trim(), 167, currentY + 5);

      console.log('Added item to PDF:', {
        position: { x: currentY, y: currentY + 5 },
        text: {
          product: produkText,
          specs: `${width}${length}`,
          quantity: qtyText,
          price: formatCurrency(item.price),
          tax: item.tax,
          total: formatCurrency(itemTotal)
        }
      });

      // Draw horizontal line
      doc.line(20, currentY + 6, 190, currentY + 6);
      // Draw vertical lines with adjusted positions
      doc.line(20, currentY, 20, currentY + 6);
      doc.line(70, currentY, 70, currentY + 6);
      doc.line(95, currentY, 95, currentY + 6);
      doc.line(115, currentY, 115, currentY + 6);
      doc.line(140, currentY, 140, currentY + 6);
      doc.line(165, currentY, 165, currentY + 6);
      doc.line(190, currentY, 190, currentY + 6);

      currentY += itemHeight;
      totalQty += item.quantity || 0;
      totalTax += (item.price * (item.quantity || 1) * (item.tax / 100));
    });

    // Calculate subtotal as the sum of item totals (including tax)
    let subtotal = 0;
    items.forEach((item, itemIndex) => {
      const itemTotal = calculateItemTotal(item);
      subtotal += itemTotal;
    });

    // Add totals and warranty info for each invoice section
    currentY += itemHeight;
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 142, currentY + 5);
    doc.text(formatCurrency(subtotal).replace("Rp", "").trim(), 167, currentY + 5);
    
    // Only show Diskon if discount > 0
    currentY += itemHeight;
    doc.text("Diskon:", 142, currentY + 5);
    doc.text(formatCurrency(order.totalAmount - subtotal).replace("Rp", "").trim(), 167, currentY + 5);
    
    currentY += itemHeight;
    doc.text("Total:", 142, currentY + 5);
    doc.text(formatCurrency(order.totalAmount).replace("Rp", "").trim(), 167, currentY + 5);

    console.log('Added totals:', {
      position: { y: currentY + 5 },
      total: formatCurrency(order.totalAmount)
    });

    // Add warranty information at fixed position from current section bottom
    const warrantyY = currentY + 45;
    doc.setFont("helvetica", "bold");
    doc.text("PERHATIAN SYARAT KLAIM GARANSI:", pageWidth / 2, warrantyY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("1. Klaim atas jumlah dan kondisi barang yang diterima tidak melebihi 1x24 jam terhitung sejak penerimaan barang.", pageWidth / 2, warrantyY + 5, { align: "center" });
    doc.text("2. Klaim atas kualitas produk harus disertai dengan invoice dan artikel yang memuat informasi produk dan produk yang dimaksud.", pageWidth / 2, warrantyY + 10, { align: "center" });

    // Add signature lines at the bottom of current section
    const signatureY = currentY + 60;
    doc.text("Penerima", 50, signatureY);
    doc.text("Pengirim", 160, signatureY);

    console.log(`Completed chunk ${pageIndex + 1}, currentY: ${currentY}`);

    // Add new page if we have more items and we're at the bottom section
    if (pageIndex < chunks.length - 1 && pageIndex % 2 === 1) {
      console.log('Adding new page');
      doc.addPage();
    }
  });

  console.log('PDF generation completed');
  return doc.output('arraybuffer');
}

function addHeader(startY: number, doc: jsPDF, order: Order, customer: any, pageWidth: number) {
  console.log('Adding header at Y position:', startY);
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
  doc.text("Telepon: 0813-89-167167", 20, startY + 24);

  // Bank Information - Left Side
  doc.text("Bank Transfer: Bank Central Asia (BCA)", 20, startY + 30);
  doc.text("No. Rek: 7753-788-788", 20, startY + 34);
  doc.text("a/n: ", 20, startY + 38);
  doc.setFont("helvetica", "bold");
  doc.text("PT. SHUNHUI ZHIYE INDONESIA", 26, startY + 38);

  // Invoice Details - Right Side
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, startY + 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`No: ${order.orderNo}`, pageWidth - 20, startY + 18, { align: "right" });
  doc.text(`Tanggal: ${format(new Date(order.createdAt), "dd MMMM yyyy")}`, pageWidth - 20, startY + 22, { align: "right" });

  // Customer Details - Right Side
  doc.text("No. Kontak:", pageWidth - 70, startY + 28);
  doc.text(customer?.phone ?? "-", pageWidth - 20, startY + 28, { align: "right" });
  doc.text("PIC:", pageWidth - 70, startY + 32);
  doc.text(customer?.name ?? "-", pageWidth - 20, startY + 32, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("Pelanggan:", pageWidth - 70, startY + 36);
  doc.setFont("helvetica", "normal");
  doc.text(customer?.company ?? "-", pageWidth - 20, startY + 36, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("Alamat:", pageWidth - 70, startY + 40);
  doc.setFont("helvetica", "normal");
  doc.text(customer?.address ?? "-", pageWidth - 20, startY + 44, { align: "right" });

  return startY + 48;
}

function addTableHeader(startY: number, doc: jsPDF, pageWidth: number) {
  console.log('Adding table header at Y position:', startY);
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);

  // Adjusted column positions for more space for 'Jumlah (Rp)'
  doc.line(20, startY, 190, startY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Produk", 22, startY + 5);
  doc.text("Tipe", 72, startY + 5); // Reduced width for Tipe
  doc.text("Qty", 97, startY + 5);
  doc.text("Harga (Rp)", 117, startY + 5);
  doc.text("Pajak (%)", 142, startY + 5);
  doc.text("Jumlah (Rp)", 167, startY + 5);
  doc.line(20, startY + 6, 190, startY + 6);

  // Vertical lines for each column
  doc.line(20, startY, 20, startY + 6);  // Start
  doc.line(70, startY, 70, startY + 6);  // After Produk
  doc.line(95, startY, 95, startY + 6);  // After Tipe
  doc.line(115, startY, 115, startY + 6); // After Qty
  doc.line(140, startY, 140, startY + 6); // After Harga
  doc.line(165, startY, 165, startY + 6); // After Pajak
  doc.line(190, startY, 190, startY + 6); // End

  return startY + 6;
} 