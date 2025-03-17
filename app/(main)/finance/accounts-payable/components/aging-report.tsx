"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

interface AgingItem {
  id: string;
  billNo: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  remainingAmount: number;
  daysPastDue: number;
  ageCategory: string;
}

export function AgingReport() {
  const [agingData, setAgingData] = useState<AgingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAgingReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/finance/aging-report", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setAgingData(data);
    } catch (err) {
      console.error("Failed to fetch aging report:", err);
      setError("Failed to load aging report. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load aging report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgingReport();
  }, []);

  // Group data by age category
  const groupedData = agingData.reduce((acc, item) => {
    if (!acc[item.ageCategory]) {
      acc[item.ageCategory] = [];
    }
    acc[item.ageCategory].push(item);
    return acc;
  }, {} as Record<string, AgingItem[]>);

  // Calculate totals for each category
  const categoryTotals = Object.entries(groupedData).map(([category, items]) => ({
    category,
    count: items.length,
    total: items.reduce((sum, item) => sum + item.remainingAmount, 0),
  }));

  // Sort categories in the correct order
  const sortOrder = ["current", "1-30", "31-60", "61-90", "90+"];
  categoryTotals.sort((a, b) => 
    sortOrder.indexOf(a.category) - sortOrder.indexOf(b.category)
  );

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchAgingReport}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (agingData.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No aging data available"
            description="Create vendor bills to see aging information."
            icon="chart-bar"
            action={{
              label: "Create Bill",
              href: "/finance/accounts-payable/create-bill",
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Aging Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {categoryTotals.map((category) => (
            <div
              key={category.category}
              className="rounded-lg border p-4 text-center"
            >
              <h3 className="font-semibold">
                {category.category === "current"
                  ? "Current"
                  : category.category === "1-30"
                  ? "1-30 Days"
                  : category.category === "31-60"
                  ? "31-60 Days"
                  : category.category === "61-90"
                  ? "61-90 Days"
                  : "90+ Days"}
              </h3>
              <p className="text-2xl font-bold">
                {formatCurrency(category.total)}
              </p>
              <p className="text-sm text-muted-foreground">
                {category.count} {category.count === 1 ? "bill" : "bills"}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Outstanding Bills</h3>
          {agingData.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg"
            >
              <div className="space-y-1 mb-2 sm:mb-0">
                <div className="font-medium">{item.billNo}</div>
                <div className="text-sm text-muted-foreground">
                  {item.vendorName}
                </div>
                <div className="text-sm">
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {item.daysPastDue > 0
                      ? `${item.daysPastDue} days past due`
                      : "Not yet due"}
                  </div>
                  <div className="font-medium">
                    {formatCurrency(item.remainingAmount)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={`/finance/accounts-payable/record-payment?billId=${item.id}`}>
                    Record Payment
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 