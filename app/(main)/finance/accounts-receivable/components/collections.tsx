"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface CollectionOrder {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  status: "overdue" | "in_collection" | "legal" | "written_off";
  lastContactDate?: Date | null;
  nextFollowUp?: Date | null;
  notes?: string;
}

export function Collections() {
  const [orders, setOrders] = useState<CollectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns: ColumnDef<CollectionOrder>[] = [
    {
      accessorKey: "invoiceNo",
      header: "Order No",
    },
    {
      accessorKey: "customerName",
      header: "Customer",
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
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => format(new Date(row.getValue("dueDate")), "PPP"),
    },
    {
      accessorKey: "daysOverdue",
      header: "Days Overdue",
      cell: ({ row }) => {
        const days = row.getValue("daysOverdue") as number;
        return (
          <Badge variant="destructive">
            {days} days
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "overdue"
                ? "destructive"
                : status === "in_collection"
                ? "secondary"
                : status === "legal"
                ? "default"
                : "outline"
            }
          >
            {status.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastContactDate",
      header: "Last Contact",
      cell: ({ row }) => {
        const date = row.getValue("lastContactDate");
        return date ? format(new Date(date as string), "PP") : "-";
      },
    },
    {
      accessorKey: "nextFollowUp",
      header: "Next Follow-up",
      cell: ({ row }) => {
        const date = row.getValue("nextFollowUp");
        return date ? format(new Date(date as string), "PP") : "-";
      },
    },
  ];

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/finance/collections", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include" // Important for including auth cookies
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch collections: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
          );
        }
        
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error("Error fetching collections:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  const totalOverdue = orders.reduce((sum, order) => sum + order.amount, 0);
  const averageDaysOverdue = Math.round(
    orders.reduce((sum, order) => sum + order.daysOverdue, 0) / orders.length || 0
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Collections</h2>
        <p className="text-muted-foreground">
          Manage overdue invoices and collection efforts
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive">
          <p className="font-medium">Error loading collections data</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No collections data available</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(totalOverdue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Orders in Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orders.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Days Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageDaysOverdue} days
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={orders}
          />
        </>
      )}
    </div>
  );
} 