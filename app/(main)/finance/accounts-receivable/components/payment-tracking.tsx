"use client";

import React, { useState, useEffect } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface Payment {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference: string;
}

const columns: ColumnDef<Payment>[] = [
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
    accessorKey: "paymentDate",
    header: "Payment Date",
    cell: ({ row }: { row: any }) => {
      const date = new Date(row.getValue("paymentDate") as string);
      return format(date, "PP");
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment Method",
  },
  {
    accessorKey: "reference",
    header: "Reference",
  },
];

const PaymentTracking: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/finance/payments", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include" // Important for including auth cookies
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch payments: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
          );
        }
        
        const data = await response.json();
        setPayments(data);
      } catch (error) {
        console.error("Error fetching payments:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payment Tracking</h2>
        <p className="text-muted-foreground">
          Track and manage customer payments
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive">
          <p className="font-medium">Error loading payment data</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No payment data available</p>
        </div>
      )}

      {!loading && !error && payments.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(totalPayments)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Payment Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments.length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(totalPayments / payments.length || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={payments}
          />
        </>
      )}
    </div>
  );
};

export default PaymentTracking; 