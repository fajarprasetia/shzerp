"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Clock, 
  FileText, 
  Calculator, 
  Download 
} from "lucide-react";

export function ReportsGrid() {
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handleReportClick = (reportType: string) => {
    setSelectedReport(reportType);
    // In a real application, this would navigate to the report page or open a modal
    // router.push(`/finance/reports/${reportType}`);
  };

  const reports = [
    {
      id: "income-statement",
      title: "Income Statement",
      description: "View revenue, expenses, and profit for a specific period",
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
    },
    {
      id: "balance-sheet",
      title: "Balance Sheet",
      description: "View assets, liabilities, and equity at a specific date",
      icon: <Calculator className="h-8 w-8 text-primary" />,
    },
    {
      id: "cash-flow",
      title: "Cash Flow",
      description: "Track cash inflows and outflows over time",
      icon: <LineChart className="h-8 w-8 text-primary" />,
    },
    {
      id: "accounts-receivable-aging",
      title: "Accounts Receivable Aging",
      description: "View outstanding customer invoices by age",
      icon: <Clock className="h-8 w-8 text-primary" />,
    },
    {
      id: "accounts-payable-aging",
      title: "Accounts Payable Aging",
      description: "View outstanding vendor bills by age",
      icon: <Clock className="h-8 w-8 text-primary" />,
    },
    {
      id: "tax-summary",
      title: "Tax Summary",
      description: "View tax liabilities and payments",
      icon: <FileText className="h-8 w-8 text-primary" />,
    },
    {
      id: "expense-breakdown",
      title: "Expense Breakdown",
      description: "Analyze expenses by category",
      icon: <PieChart className="h-8 w-8 text-primary" />,
    },
    {
      id: "revenue-analysis",
      title: "Revenue Analysis",
      description: "Analyze revenue by customer and product",
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>
            Generate and view financial reports in IDR currency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reports.map((report) => (
              <Card 
                key={report.id}
                className={`p-4 border-2 hover:border-primary cursor-pointer transition-colors ${
                  selectedReport === report.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => handleReportClick(report.id)}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  {report.icon}
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {report.description}
                  </CardDescription>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 flex justify-end">
            <Button 
              variant="outline" 
              className="mr-2"
              disabled={!selectedReport}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
            <Button disabled={!selectedReport}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 