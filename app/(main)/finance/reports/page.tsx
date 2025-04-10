"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { withPermission } from "@/app/components/with-permission";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { formatCurrency } from "@/lib/utils";
import { BudgetVarianceAnalysis } from "./components/budget-variance-analysis";
import { useBudgets } from "../hooks/use-budgets";
import { useTransactions } from "../hooks/use-transactions";

// Define the reports available in the system
const reports = [
  {
    title: "Profit & Loss",
    description: "View income, expenses, and net profit",
    type: "pl"
  },
  {
    title: "Balance Sheet",
    description: "View assets, liabilities, and equity",
    type: "bs"
  },
  {
    title: "Cash Flow",
    description: "Track cash inflows and outflows",
    type: "cf"
  },
  {
    title: "Budget Variance",
    description: "Analyze budget performance and variances",
    type: "budget-variance"
  },
  {
    title: "Sales Report",
    description: "Analyze sales by customer and product",
    type: "sales"
  },
  {
    title: "Expense Report",
    description: "Track expenses by category",
    type: "expense"
  },
  {
    title: "Tax Report",
    description: "Summarize tax liabilities",
    type: "tax"
  }
];

export default withPermission(ReportsPage, "finance", "read");

function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();

  const handleGenerateReport = async (type: string) => {
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for the report",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/finance/reports/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: date.toISOString() }),
      });

      if (!response.ok) {
        throw new Error(`Error generating report: ${response.statusText}`);
      }

      const data = await response.json();
      setReportData(data);
      
      toast({
        title: "Report generated",
        description: `${getReportTitle(type)} has been generated successfully.`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || !selectedReport) return;
    
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const reportTitle = getReportTitle(selectedReport);
      const dateStr = date ? format(date, 'MMMM yyyy') : '';
      
      // Add header
      doc.setFontSize(18);
      doc.text(reportTitle, 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`For period: ${dateStr}`, 105, 25, { align: 'center' });
      doc.text('Shun Hui Zhiye', 105, 35, { align: 'center' });
      
      // Add report content based on type
      switch (selectedReport) {
        case 'pl':
          exportProfitLossReport(doc, reportData);
          break;
        case 'bs':
          exportBalanceSheetReport(doc, reportData);
          break;
        case 'cf':
          exportCashFlowReport(doc, reportData);
          break;
        case 'budget-variance':
          exportBudgetVarianceReport(doc, reportData);
          break;
        case 'sales':
          exportSalesReport(doc, reportData);
          break;
        case 'expense':
          exportExpenseReport(doc, reportData);
          break;
        case 'tax':
          exportTaxReport(doc, reportData);
          break;
      }
      
      // Save the PDF
      doc.save(`${selectedReport}_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Export successful",
        description: `${reportTitle} has been exported to PDF.`,
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the report to PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getReportTitle = (type: string): string => {
    const report = reports.find(r => r.type === type);
    return report ? report.title : 'Financial Report';
  };

  // Export functions for different report types
  const exportProfitLossReport = (doc: any, data: any) => {
    // Summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Item', 'Amount (IDR)']],
      body: [
        ['Total Income', formatCurrency(data.income)],
        ['Total Expenses', formatCurrency(data.expenses)],
        ['Net Profit', formatCurrency(data.netProfit)],
      ],
      headStyles: { fillColor: [41, 128, 185] },
      foot: [['Net Profit', formatCurrency(data.netProfit)]],
      footStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    });
    
    // Transactions section
    doc.setFontSize(14);
    doc.text('Transactions', 14, doc.autoTable.previous.finalY + 15);
    
    const transactionsBody = data.transactions.map((t: any) => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.description || 'No description',
      t.type === 'credit' ? 'Income' : 'Expense',
      formatCurrency(t.amount),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Date', 'Description', 'Type', 'Amount (IDR)']],
      body: transactionsBody,
    });
  };

  const exportBalanceSheetReport = (doc: any, data: any) => {
    // Assets section
    doc.setFontSize(14);
    doc.text('Assets', 14, 50);
    
    const bankAccountsBody = data.assets.bankAccounts.map((a: any) => [
      a.accountName || a.bankName,
      formatCurrency(a.balance),
    ]);
    
    doc.autoTable({
      startY: 55,
      head: [['Bank Account', 'Balance (IDR)']],
      body: bankAccountsBody,
      foot: [['Total Assets', formatCurrency(data.assets.total)]],
      footStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    });
    
    // Liabilities section
    doc.setFontSize(14);
    doc.text('Liabilities', 14, doc.autoTable.previous.finalY + 15);
    
    const payablesBody = data.liabilities.payables.map((p: any) => [
      p.description || `Bill #${p.id}`,
      formatCurrency(p.amount),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Description', 'Amount (IDR)']],
      body: payablesBody.length ? payablesBody : [['No liabilities', '0']],
      foot: [['Total Liabilities', formatCurrency(data.liabilities.total)]],
      footStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    });
    
    // Equity section
    doc.setFontSize(14);
    doc.text('Equity', 14, doc.autoTable.previous.finalY + 15);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Item', 'Amount (IDR)']],
      body: [['Equity', formatCurrency(data.equity)]],
      headStyles: { fillColor: [41, 128, 185] },
    });
  };

  const exportCashFlowReport = (doc: any, data: any) => {
    // Summary section
    doc.setFontSize(14);
    doc.text('Cash Flow Summary', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Item', 'Amount (IDR)']],
      body: [
        ['Total Inflow', formatCurrency(data.totalInflow)],
        ['Total Outflow', formatCurrency(data.totalOutflow)],
        ['Net Cash Flow', formatCurrency(data.netCashFlow)],
      ],
      headStyles: { fillColor: [41, 128, 185] },
      foot: [['Net Cash Flow', formatCurrency(data.netCashFlow)]],
      footStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    });
    
    // Category breakdown
    doc.setFontSize(14);
    doc.text('Cash Flow by Category', 14, doc.autoTable.previous.finalY + 15);
    
    const categoryBody = Object.entries(data.categorySummary).map(([category, values]: [string, any]) => [
      category,
      formatCurrency(values.inflow),
      formatCurrency(values.outflow),
      formatCurrency(values.inflow - values.outflow),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Category', 'Inflow (IDR)', 'Outflow (IDR)', 'Net (IDR)']],
      body: categoryBody,
    });
    
    // Account balances
    doc.setFontSize(14);
    doc.text('Account Balances', 14, doc.autoTable.previous.finalY + 15);
    
    const balancesBody = data.endingBalances.map((a: any) => [
      a.accountName,
      formatCurrency(a.balance),
      formatCurrency(a.endingBalance),
      formatCurrency(a.endingBalance - a.balance),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Account', 'Beginning (IDR)', 'Ending (IDR)', 'Change (IDR)']],
      body: balancesBody,
    });
  };

  const exportSalesReport = (doc: any, data: any) => {
    // Summary section
    doc.setFontSize(14);
    doc.text('Sales Summary', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Item', 'Value']],
      body: [
        ['Total Sales', formatCurrency(data.totalSales)],
        ['Total Invoices', data.totalInvoices.toString()],
        ['Average Invoice Value', formatCurrency(data.totalSales / (data.totalInvoices || 1))],
      ],
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Customer breakdown
    doc.setFontSize(14);
    doc.text('Sales by Customer', 14, doc.autoTable.previous.finalY + 15);
    
    const customerBody = Object.entries(data.customerSummary).map(([customer, values]: [string, any]) => [
      customer,
      values.count.toString(),
      formatCurrency(values.total),
      formatCurrency(values.total / values.count),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Customer', 'Invoices', 'Total (IDR)', 'Average (IDR)']],
      body: customerBody,
    });
    
    // Product breakdown
    doc.setFontSize(14);
    doc.text('Sales by Product', 14, doc.autoTable.previous.finalY + 15);
    
    const productBody = Object.entries(data.productSummary).map(([product, values]: [string, any]) => [
      product,
      values.quantity.toString(),
      formatCurrency(values.total),
      formatCurrency(values.total / values.quantity),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Product', 'Quantity', 'Total (IDR)', 'Unit Price (IDR)']],
      body: productBody,
    });
  };

  const exportExpenseReport = (doc: any, data: any) => {
    // Summary section
    doc.setFontSize(14);
    doc.text('Expense Summary', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Item', 'Value']],
      body: [
        ['Total Expenses', formatCurrency(data.totalExpenses)],
        ['Total Bills', data.totalBills.toString()],
        ['Average Bill Amount', formatCurrency(data.totalExpenses / (data.totalBills || 1))],
      ],
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Category breakdown
    doc.setFontSize(14);
    doc.text('Expenses by Category', 14, doc.autoTable.previous.finalY + 15);
    
    const categoryBody = Object.entries(data.categorySummary).map(([category, values]: [string, any]) => [
      category,
      formatCurrency(values.total),
      `${((values.total / data.totalExpenses) * 100).toFixed(2)}%`,
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Category', 'Amount (IDR)', 'Percentage']],
      body: categoryBody,
    });
    
    // Vendor breakdown
    doc.setFontSize(14);
    doc.text('Expenses by Vendor', 14, doc.autoTable.previous.finalY + 15);
    
    const vendorBody = Object.entries(data.vendorSummary).map(([vendor, values]: [string, any]) => [
      vendor,
      values.count.toString(),
      formatCurrency(values.total),
      formatCurrency(values.total / values.count),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Vendor', 'Bills', 'Total (IDR)', 'Average (IDR)']],
      body: vendorBody,
    });
  };

  const exportTaxReport = (doc: any, data: any) => {
    // Summary section
    doc.setFontSize(14);
    doc.text('Tax Summary', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Item', 'Value']],
      body: [
        ['Total Taxes', formatCurrency(data.totalTaxes)],
      ],
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Tax type breakdown
    doc.setFontSize(14);
    doc.text('Taxes by Type', 14, doc.autoTable.previous.finalY + 15);
    
    const taxTypeBody = Object.entries(data.taxSummary).map(([taxType, values]: [string, any]) => [
      taxType,
      values.count.toString(),
      formatCurrency(values.total),
      `${((values.total / data.totalTaxes) * 100).toFixed(2)}%`,
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Tax Type', 'Transactions', 'Amount (IDR)', 'Percentage']],
      body: taxTypeBody,
    });
    
    // Transactions
    doc.setFontSize(14);
    doc.text('Tax Transactions', 14, doc.autoTable.previous.finalY + 15);
    
    const transactionsBody = data.taxTransactions.map((t: any) => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.description || 'No description',
      t.category?.name || 'Uncategorized',
      formatCurrency(t.amount),
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Date', 'Description', 'Tax Type', 'Amount (IDR)']],
      body: transactionsBody,
    });
  };

  const exportBudgetVarianceReport = (doc: any, data: any) => {
    // Summary section
    doc.setFontSize(14);
    doc.text('Budget Variance Summary', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Item', 'Amount (IDR)']],
      body: [
        ['Total Budgeted', formatCurrency(data.totalBudgeted)],
        ['Total Actual', formatCurrency(data.totalActual)],
        ['Variance', formatCurrency(data.totalVariance)],
        ['Variance %', `${data.totalVariancePercent.toFixed(1)}%`],
      ],
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Categories section
    doc.setFontSize(14);
    doc.text('Category Breakdown', 14, doc.autoTable.previous.finalY + 15);
    
    const categoriesBody = data.categories.map((c: any) => [
      c.category,
      formatCurrency(c.budgeted),
      formatCurrency(c.actual),
      formatCurrency(c.variance),
      `${c.variancePercent.toFixed(1)}%`,
    ]);
    
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 20,
      head: [['Category', 'Budgeted', 'Actual', 'Variance', 'Variance %']],
      body: categoriesBody,
      foot: [['Total', formatCurrency(data.totalBudgeted), formatCurrency(data.totalActual), formatCurrency(data.totalVariance), `${data.totalVariancePercent.toFixed(1)}%`]],
      footStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    });
    
    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      doc.setFontSize(14);
      doc.text('Recommendations', 14, doc.autoTable.previous.finalY + 15);
      
      const recommendationsBody = data.recommendations.map((r: any) => [
        r.title,
        r.description,
        r.action,
      ]);
      
      doc.autoTable({
        startY: doc.autoTable.previous.finalY + 20,
        head: [['Issue', 'Description', 'Recommendation']],
        body: recommendationsBody,
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Financial Reports</h1>
      
      {!selectedReport ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card 
              key={report.type}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedReport(report.type)}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold">{report.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{report.description}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{getReportTitle(selectedReport)}</h2>
              <p className="text-muted-foreground">
                {date ? `For period: ${format(date, 'MMMM yyyy')}` : 'Select a date'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Select Date</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Select Report Date</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Calendar
                      value={date}
                      onChange={(value) => {
                        if (value instanceof Date) {
                          setDate(value);
                        } else if (Array.isArray(value) && value[0] instanceof Date) {
                          setDate(value[0]);
                        }
                      }}
                      className="mx-auto rounded-md border shadow-sm"
                      maxDate={new Date()}
                      minDetail="year"
                      maxDetail="month"
                      locale="en-US"
                      nextLabel="→"
                      nextAriaLabel="Next month"
                      prevLabel="←"
                      prevAriaLabel="Previous month"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                onClick={() => setSelectedReport(null)}
              >
                Back to Reports
              </Button>
              
              {selectedReport !== 'budget-variance' && (
                <Button 
                  onClick={() => handleGenerateReport(selectedReport)}
                  disabled={isLoading || !date}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Report
                </Button>
              )}
              
              {reportData && selectedReport !== 'budget-variance' && (
                <Button 
                  variant="secondary" 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export PDF
                </Button>
              )}
            </div>
          </div>
          
          {selectedReport === 'budget-variance' ? (
            <BudgetVarianceAnalysis 
              budgets={Array.isArray(budgets) ? budgets : []}
              transactions={Array.isArray(transactions) ? transactions : []}
              onExport={handleExportPDF}
            />
          ) : (
            isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Generating report...</span>
              </div>
            ) : reportData ? (
              renderReportContent()
            ) : (
              <div className="rounded-lg border p-8 text-center">
                <h3 className="text-lg font-medium">No Report Data</h3>
                <p className="text-muted-foreground mt-2">
                  Select a date and generate the report to view data.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
} 