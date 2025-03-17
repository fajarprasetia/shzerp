"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { withPermission } from "@/app/components/with-permission";

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

  const handleGenerateReport = async (type: string) => {
    // Implementation for generating reports
    console.log(`Generating ${type} report for date:`, date);
    // Close the dialog
    setSelectedReport(null);
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Financial Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.type} className="p-6 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">{report.title}</h2>
            <p className="text-muted-foreground mb-4">{report.description}</p>
            <Dialog open={selectedReport === report.type} onOpenChange={(open) => {
              if (!open) setSelectedReport(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedReport(report.type)}>Generate Report</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate {report.title}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Select Date Range</h3>
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setSelectedReport(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleGenerateReport(report.type)}>
                      Generate
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        ))}
      </div>
    </div>
  );
} 