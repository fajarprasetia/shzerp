"use client";

import { useState, useCallback, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { handleAuthError } from "@/app/lib/client-auth";
import { useToast } from "@/components/ui/use-toast";

interface Payment {
  id: string;
  billId: string;
  billNo: string;
  vendorName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  status: "pending" | "completed" | "failed";
  reference?: string;
}

export function PaymentTracking() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "billNo",
      header: "Bill No",
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(amount);
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => {
        try {
          return format(new Date(row.getValue("paymentDate")), "PPP");
        } catch (error) {
          return "Invalid date";
        }
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "completed"
                ? "success"
                : status === "failed"
                ? "destructive"
                : "default"
            }
          >
            {status}
          </Badge>
        );
      },
    },
  ];

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/finance/vendor-payments", {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      // Handle auth error and redirect if needed
      if (handleAuthError(response, "/finance/accounts-payable")) {
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError("Failed to fetch payments. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to fetch payments. Please try again later.",
        variant: "destructive",
      });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Tracking</h2>
          <p className="text-muted-foreground">
            Track and manage vendor payments
          </p>
        </div>
        <Button onClick={() => fetchPayments()}>Refresh Data</Button>
      </div>

      {error && (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={() => fetchPayments()}
          >
            Try Again
          </Button>
        </div>
      )}

      {!error && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Total Payments</h3>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Pending Payments</h3>
            <p className="text-2xl font-bold">
              {payments.filter((p) => p.status === "pending").length}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Failed Payments</h3>
            <p className="text-2xl font-bold">
              {payments.filter((p) => p.status === "failed").length}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : payments.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">No payments found</p>
          <Button onClick={() => fetchPayments()}>Refresh Data</Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
        />
      )}
    </div>
  );
} 