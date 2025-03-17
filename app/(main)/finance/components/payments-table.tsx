"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

interface Payment {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference: string;
  notes?: string;
  invoiceNo?: string;
  customerName?: string;
  recordedBy?: string;
  formattedDate?: string;
  order?: {
    orderNo: string;
    customer: {
      name: string;
    };
  };
}

export function PaymentsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/finance/payments");
      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "invoiceNo",
      header: "Invoice No",
      cell: ({ row }) => {
        return row.getValue("invoiceNo") || "N/A";
      },
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        return row.getValue("customerName") || "N/A";
      },
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
      header: "Date",
      cell: ({ row }) => {
        if (row.original.formattedDate) {
          return row.original.formattedDate;
        }
        const date = new Date(row.getValue("paymentDate"));
        return date.toLocaleDateString();
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
    },
    {
      accessorKey: "reference",
      header: "Reference",
    },
    {
      accessorKey: "recordedBy",
      header: "Recorded By",
    },
    {
      accessorKey: "notes",
      header: "Notes",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payments</h2>
      </div>

      <DataTable columns={columns} data={payments} />
    </div>
  );
} 