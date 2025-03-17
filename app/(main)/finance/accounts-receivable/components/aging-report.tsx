"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";

interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  status: "paid" | "unpaid" | "overdue";
}

interface AgingBucket {
  range: string;
  count: number;
  total: number;
  invoices: Invoice[];
}

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoiceNo",
    header: "Invoice No",
  },
  {
    accessorKey: "customerName",
    header: "Customer",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }: { row: any }) => {
      const amount = parseFloat(row.getValue("amount"));
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }: { row: any }) => {
      const date = new Date(row.getValue("dueDate") as string);
      const daysOverdue = differenceInDays(new Date(), date);
      return (
        <div className="flex flex-col">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-sm text-red-500">
            {daysOverdue > 0 ? `${daysOverdue} days overdue` : ""}
          </span>
        </div>
      );
    },
  },
];

export function AgingReport() {
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgingReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/finance/aging-report", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include" // Important for including auth cookies
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch aging report: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
          );
        }
        
        const data = await response.json();
        setAgingData(data);
      } catch (error) {
        console.error("Error fetching aging report:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAgingReport();
  }, []);

  const bucketColors = {
    "0-30": "bg-green-100",
    "31-60": "bg-yellow-100",
    "61-90": "bg-orange-100",
    "90+": "bg-red-100",
    "Over": "bg-red-100"
  };

  const getBucketColor = (range: string) => {
    const prefix = range.split(" ")[0];
    return bucketColors[prefix as keyof typeof bucketColors] || "bg-gray-100";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Aging Report</h2>
        <p className="text-muted-foreground">
          Track overdue invoices by age ranges
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive">
          <p className="font-medium">Error loading aging report</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && agingData.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No aging data available</p>
        </div>
      )}

      {!loading && !error && agingData.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {agingData.map((bucket) => (
              <Card
                key={bucket.range}
                className={`cursor-pointer transition-colors ${
                  getBucketColor(bucket.range)
                } ${selectedBucket === bucket.range ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedBucket(bucket.range)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {bucket.range}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${bucket.total.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bucket.count} invoices
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={
              selectedBucket
                ? agingData.find((b) => b.range === selectedBucket)?.invoices || []
                : agingData.flatMap((b) => b.invoices)
            }
          />
        </>
      )}
    </div>
  );
} 