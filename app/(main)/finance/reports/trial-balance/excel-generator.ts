import { Workbook, Row, Cell } from 'exceljs';
import { format } from "date-fns";
import { TrialBalanceData, TrialBalanceRow } from "@/types/finance";

export async function generateTrialBalanceExcel(data: TrialBalanceData): Promise<ArrayBuffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Trial Balance');

  // Set column widths
  worksheet.columns = [
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Account', key: 'name', width: 40 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Debit', key: 'debit', width: 15 },
    { header: 'Credit', key: 'credit', width: 15 },
  ];

  // Add title
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Trial Balance';
  titleCell.font = {
    size: 16,
    bold: true
  };
  titleCell.alignment = { horizontal: 'center' };

  // Add date
  worksheet.mergeCells('A2:E2');
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `As of: ${format(new Date(data.asOfDate), "PPP")}`;
  dateCell.font = {
    size: 10
  };
  dateCell.alignment = { horizontal: 'center' };

  // Add company info
  worksheet.mergeCells('A3:E3');
  const companyCell = worksheet.getCell('A3');
  companyCell.value = 'PT. SHUNHUI ZHIYE INDONESIA';
  companyCell.font = {
    size: 12,
    bold: true
  };

  worksheet.mergeCells('A4:E4');
  const addressCell1 = worksheet.getCell('A4');
  addressCell1.value = 'Jl. Cibaligo No. 167, RT 001 RW 030, Desa Cibereum,';
  
  worksheet.mergeCells('A5:E5');
  const addressCell2 = worksheet.getCell('A5');
  addressCell2.value = 'Kecamatan Cimahi Selatan, Kota Cimahi, Jawa Barat';

  // Add summary section
  worksheet.mergeCells('A7:E7');
  const summaryTitleCell = worksheet.getCell('A7');
  summaryTitleCell.value = 'Summary by Account Type';
  summaryTitleCell.font = {
    size: 12,
    bold: true
  };

  // Add summary headers
  const summaryHeaderRow = worksheet.getRow(8);
  summaryHeaderRow.values = ['Account Type', 'Debit', 'Credit'];
  summaryHeaderRow.font = { bold: true };

  // Add summary data
  let rowIndex = 9;
  Object.entries(data.summary.byType).forEach(([type, totals]) => {
    const row = worksheet.getRow(rowIndex);
    row.values = [
      type.replace(/_/g, " "),
      totals.debit,
      totals.credit
    ];
    row.getCell(2).numFmt = '#,##0.00';
    row.getCell(3).numFmt = '#,##0.00';
    rowIndex++;
  });

  // Add summary total
  const summaryTotalRow = worksheet.getRow(rowIndex);
  summaryTotalRow.values = [
    'Total',
    data.summary.totalDebit,
    data.summary.totalCredit
  ];
  summaryTotalRow.font = { bold: true };
  summaryTotalRow.getCell(2).numFmt = '#,##0.00';
  summaryTotalRow.getCell(3).numFmt = '#,##0.00';
  rowIndex += 2;

  // Add accounts section title
  worksheet.mergeCells(`A${rowIndex}:E${rowIndex}`);
  const accountsTitleCell = worksheet.getCell(`A${rowIndex}`);
  accountsTitleCell.value = 'Account Details';
  accountsTitleCell.font = {
    size: 12,
    bold: true
  };
  rowIndex++;

  // Style the header row
  const headerRow = worksheet.getRow(rowIndex);
  headerRow.values = ['Code', 'Account', 'Type', 'Debit', 'Credit'];
  headerRow.font = { bold: true };
  rowIndex++;

  // Add account data
  data.accounts.forEach((account: TrialBalanceRow) => {
    const row = worksheet.getRow(rowIndex);
    row.values = [
      account.code,
      account.name,
      account.type.replace(/_/g, " "),
      account.debit,
      account.credit
    ];
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '#,##0.00';
    rowIndex++;
  });

  // Add total row
  const totalRow = worksheet.getRow(rowIndex);
  totalRow.values = [
    '',
    'Total',
    '',
    data.summary.totalDebit,
    data.summary.totalCredit
  ];
  totalRow.font = { bold: true };
  totalRow.getCell(4).numFmt = '#,##0.00';
  totalRow.getCell(5).numFmt = '#,##0.00';

  // Add borders to all cells
  worksheet.eachRow((row: Row) => {
    row.eachCell((cell: Cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
} 