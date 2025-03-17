import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { TrialBalanceData, TrialBalanceRow } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

export async function generateTrialBalancePDF(data: TrialBalanceData): Promise<ArrayBuffer> {
  // Initialize PDF with A4 size in portrait orientation
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;  // A4 width
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Add header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Trial Balance", pageWidth / 2, margin, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`As of: ${format(new Date(data.asOfDate), "PPP")}`, pageWidth / 2, margin + 8, { align: "center" });

  // Add company info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PT. SHUNHUI ZHIYE INDONESIA", margin, margin + 20);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Jl. Cibaligo No. 167, RT 001 RW 030, Desa Cibereum,", margin, margin + 25);
  doc.text("Kecamatan Cimahi Selatan, Kota Cimahi, Jawa Barat", margin, margin + 29);

  // Add summary by type
  let yPos = margin + 40;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Summary by Account Type", margin, yPos);
  yPos += 5;

  // Draw summary table
  const summaryColWidths = [60, 40, 40];
  const summaryStartX = margin;
  
  // Draw header
  doc.setLineWidth(0.1);
  doc.line(summaryStartX, yPos, summaryStartX + 140, yPos);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  yPos += 5;
  doc.text("Account Type", summaryStartX + 2, yPos);
  doc.text("Debit", summaryStartX + summaryColWidths[0] + 2, yPos);
  doc.text("Credit", summaryStartX + summaryColWidths[0] + summaryColWidths[1] + 2, yPos);
  yPos += 2;
  doc.line(summaryStartX, yPos, summaryStartX + 140, yPos);

  // Draw summary rows
  doc.setFont("helvetica", "normal");
  Object.entries(data.summary.byType).forEach(([type, totals]) => {
    yPos += 5;
    doc.text(type.replace(/_/g, " "), summaryStartX + 2, yPos);
    doc.text(formatCurrency(totals.debit).replace("Rp", "").trim(), 
      summaryStartX + summaryColWidths[0] + summaryColWidths[1], yPos, { align: "right" });
    doc.text(formatCurrency(totals.credit).replace("Rp", "").trim(),
      summaryStartX + summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], yPos, { align: "right" });
  });

  // Draw total line
  yPos += 2;
  doc.line(summaryStartX, yPos, summaryStartX + 140, yPos);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Total", summaryStartX + 2, yPos);
  doc.text(formatCurrency(data.summary.totalDebit).replace("Rp", "").trim(),
    summaryStartX + summaryColWidths[0] + summaryColWidths[1], yPos, { align: "right" });
  doc.text(formatCurrency(data.summary.totalCredit).replace("Rp", "").trim(),
    summaryStartX + summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2], yPos, { align: "right" });

  // Add detailed accounts table
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Account Details", margin, yPos);
  yPos += 5;

  // Define column widths for the main table
  const colWidths = [25, 65, 40, 30, 30];
  const startX = margin;
  
  // Draw header
  doc.setLineWidth(0.1);
  doc.line(startX, yPos, startX + contentWidth, yPos);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  yPos += 5;
  doc.text("Code", startX + 2, yPos);
  doc.text("Account", startX + colWidths[0] + 2, yPos);
  doc.text("Type", startX + colWidths[0] + colWidths[1] + 2, yPos);
  doc.text("Debit", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { align: "right" });
  doc.text("Credit", startX + contentWidth, yPos, { align: "right" });
  yPos += 2;
  doc.line(startX, yPos, startX + contentWidth, yPos);

  // Draw account rows
  doc.setFont("helvetica", "normal");
  data.accounts.forEach((account: TrialBalanceRow) => {
    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = margin;
    }

    yPos += 5;
    doc.text(account.code, startX + 2, yPos);
    doc.text(account.name, startX + colWidths[0] + 2, yPos);
    doc.text(account.type.replace(/_/g, " "), startX + colWidths[0] + colWidths[1] + 2, yPos);
    doc.text(formatCurrency(account.debit).replace("Rp", "").trim(),
      startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { align: "right" });
    doc.text(formatCurrency(account.credit).replace("Rp", "").trim(),
      startX + contentWidth, yPos, { align: "right" });
  });

  // Draw final total line
  yPos += 2;
  doc.line(startX, yPos, startX + contentWidth, yPos);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Total", startX + colWidths[0] + 2, yPos);
  doc.text(formatCurrency(data.summary.totalDebit).replace("Rp", "").trim(),
    startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { align: "right" });
  doc.text(formatCurrency(data.summary.totalCredit).replace("Rp", "").trim(),
    startX + contentWidth, yPos, { align: "right" });

  return doc.output('arraybuffer');
} 