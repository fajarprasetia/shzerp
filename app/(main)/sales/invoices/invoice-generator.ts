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
  
  const price = Number(item.price) || 0;
  const tax = Number(item.tax) || 0;
  const taxMultiplier = 1 + (tax / 100);

  let subtotal = 0;

  switch (item.type) {
    case "Sublimation Paper":
      if (item.product === "Jumbo Roll") {
        const weight = Number(item.weight) || 
          (item.stock?.weight ? Number(item.stock.weight) : 0);
        
        subtotal = price * weight;
      } else if (item.product === "Roll") {
        const width = Number(item.width || item.stock?.width) / 100; // Convert to meters
        const length = Number(item.length || item.stock?.length) || 0;
        const quantity = Number(item.quantity) || 1;
        
        subtotal = price * width * length * quantity;
      }
      break;

    case "Protect Paper":
      const protectWeight = Number(item.weight || item.stock?.weight) || 0;
      subtotal = price * protectWeight;
      break;

    case "DTF Film":
    case "Ink":
      const quantity = Number(item.quantity) || 1;
      subtotal = price * quantity;
      break;
  }

  return subtotal * taxMultiplier;
}

export async function generateInvoicePDF(order: Order): Promise<ArrayBuffer> {
  // Fetch customer data from API
  const customer = await fetchCustomer(order.customerId);

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
    doc.text(customer?.address ?? "-", pageWidth - 20, startY + 40, { align: "right" });

    return startY + 48;
  }

  // Function to add table header at specific Y position
  function addTableHeader(startY: number) {
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);

    // Draw table header with wider columns
    doc.line(20, startY, 190, startY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Produk", 22, startY + 5);
    doc.text("Tipe", 72, startY + 5);
    doc.text("Qty", 112, startY + 5);
    doc.text("Harga (Rp)", 132, startY + 5);
    doc.text("Pajak (%)", 157, startY + 5);
    doc.text("Jumlah (Rp)", 172, startY + 5);
    doc.line(20, startY + 6, 190, startY + 6);

    // Vertical lines with adjusted positions
    doc.line(20, startY, 20, startY + 6);  // Start
    doc.line(70, startY, 70, startY + 6);  // After Produk
    doc.line(110, startY, 110, startY + 6); // After Tipe
    doc.line(130, startY, 130, startY + 6); // After Qty
    doc.line(155, startY, 155, startY + 6); // After Harga
    doc.line(170, startY, 170, startY + 6); // After Pajak
    doc.line(190, startY, 190, startY + 6); // End

    return startY + 6;
  }

  let currentY = 0;
  
  doc.setFont("helvetica", "normal");
  let totalQty = 0;
  let totalTax = 0;

  chunks.forEach((items, pageIndex) => {
    // Calculate starting Y position for each invoice
    // If it's the second invoice on the page, start at the middle
    currentY = pageIndex % 2 === 0 ? 0 : invoiceHeight;
    
    let startY = addHeader(currentY);
    currentY = addTableHeader(startY);

    items.forEach((item) => {
      if (!item.type) return;

      const product = item.stock || item.divided;
      const isJumboRoll = item.type === "Sublimation Paper" && item.product === "Jumbo Roll";
      
      // Product column (GSM + Type)
      let gsm = "N/A";
      if (product?.gsm) {
        gsm = product.gsm.toString();
      } else if (item.gsm) {
        gsm = item.gsm.toString();
      }
      doc.text(`${gsm}g ${item.type}`, 22, currentY + 5);

      // Type column (Width x Length or just Width)
      let width = "N/A";
      let length = "";
      
      if (product?.width) {
        width = product.width.toString();
      } else if (item.width) {
        width = item.width.toString();
      }

      if (!isJumboRoll) {
        if (product?.length) {
          length = ` x ${product.length}`;
        } else if (item.length) {
          length = ` x ${item.length}`;
        }
      }
      
      doc.text(`${width}${length}`, 72, currentY + 5);

      // Quantity column
      let qtyText = "N/A";
      if (isJumboRoll) {
        const weight = product?.weight || item.weight;
        qtyText = weight ? `${weight} kg` : "N/A";
      } else {
        qtyText = item.quantity ? `${item.quantity} Roll` : "N/A";
      }
      doc.text(qtyText, 112, currentY + 5);

      // Price, Tax, and Amount
      doc.text(formatCurrency(item.price).replace("Rp", "").trim(), 132, currentY + 5);
      doc.text(item.tax.toString(), 157, currentY + 5);

      // Calculate and display the total for this item
      const itemTotal = calculateItemTotal(item);
      doc.text(formatCurrency(itemTotal).replace("Rp", "").trim(), 172, currentY + 5);

      // Draw horizontal line
      doc.line(20, currentY + 6, 190, currentY + 6);
      // Draw vertical lines with adjusted positions
      doc.line(20, currentY, 20, currentY + 6);
      doc.line(70, currentY, 70, currentY + 6);
      doc.line(110, currentY, 110, currentY + 6);
      doc.line(130, currentY, 130, currentY + 6);
      doc.line(155, currentY, 155, currentY + 6);
      doc.line(170, currentY, 170, currentY + 6);
      doc.line(190, currentY, 190, currentY + 6);

      currentY += itemHeight;
      totalQty += item.quantity || 0;
      totalTax += (item.price * (item.quantity || 1) * (item.tax / 100));
    });

    // Add totals and warranty info for each invoice section
    currentY += itemHeight;
    
    // Draw totals with adjusted positions
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 157, currentY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(order.totalAmount).replace("Rp", "").trim(), 172, currentY + 5);

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

    // Add new page if we have more items and we're at the bottom section
    if (pageIndex < chunks.length - 1 && pageIndex % 2 === 1) {
      doc.addPage();
    }
  });

  return doc.output('arraybuffer');
} 