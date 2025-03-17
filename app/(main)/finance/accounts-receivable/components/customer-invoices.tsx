"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, FileText, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceForm } from "./invoice-form";

interface CustomerInvoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customer: {
    name: string;
    company: string;
  };
  amount: number;
  dueDate: Date;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  createdAt: Date;
  paidAt?: Date | null;
}

export function CustomerInvoices() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const { toast } = useToast();

  const columns: ColumnDef<CustomerInvoice>[] = [
    {
      accessorKey: "invoiceNo",
      header: "Invoice No",
    },
    {
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div>{row.original.customer.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.customer.company}
          </div>
        </div>
      ),
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
      cell: ({ row }) => format(new Date(row.getValue("dueDate")), "dd/MM/yyyy"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "paid"
                ? "success"
                : status === "overdue"
                ? "destructive"
                : status === "sent"
                ? "default"
                : "secondary"
            }
          >
            {status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd/MM/yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;

        const handleSend = async () => {
          try {
            const response = await fetch(`/api/finance/invoices/${invoice.id}/send`, {
              method: "POST",
            });

            if (!response.ok) {
              throw new Error("Failed to send invoice");
            }

            toast({
              title: "Success",
              description: "Invoice has been sent to the customer",
            });

            // Refresh invoices
            fetchInvoices();
          } catch (error) {
            console.error("Error sending invoice:", error);
            toast({
              title: "Error",
              description: "Failed to send invoice",
              variant: "destructive",
            });
          }
        };

        const handleMarkAsPaid = async () => {
          try {
            const response = await fetch(`/api/finance/invoices/${invoice.id}/mark-paid`, {
              method: "POST",
            });

            if (!response.ok) {
              throw new Error("Failed to mark invoice as paid");
            }

            toast({
              title: "Success",
              description: "Invoice has been marked as paid",
            });

            // Refresh invoices
            fetchInvoices();
          } catch (error) {
            console.error("Error marking invoice as paid:", error);
            toast({
              title: "Error",
              description: "Failed to mark invoice as paid",
              variant: "destructive",
            });
          }
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(invoice);
                  setShowForm(true);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={handleSend}>
                  Send Invoice
                </DropdownMenuItem>
              )}
              {invoice.status === "sent" && (
                <DropdownMenuItem onClick={handleMarkAsPaid}>
                  Mark as Paid
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/finance/invoices");
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Customer Invoices</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        searchKey="invoiceNo"
      />

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setSelectedInvoice(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice ? "Invoice Details" : "Create New Invoice"}
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoice={selectedInvoice}
            onSuccess={() => {
              setShowForm(false);
              setSelectedInvoice(null);
              fetchInvoices();
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedInvoice(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 