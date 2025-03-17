"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

interface VendorBill {
  id: string;
  billNo: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  billDate: Date;
  status: "draft" | "pending" | "paid" | "overdue";
  notes?: string;
}

export const columns: ColumnDef<VendorBill>[] = [
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
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(amount);
      return formatted;
    },
  },
  {
    accessorKey: "billDate",
    header: "Bill Date",
    cell: ({ row }) => format(new Date(row.getValue("billDate")), "MMM d, yyyy"),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => format(new Date(row.getValue("dueDate")), "MMM d, yyyy"),
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
              : status === "draft"
              ? "secondary"
              : "default"
          }
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const bill = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(bill.id)}
            >
              Copy bill ID
            </DropdownMenuItem>
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Update status</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 