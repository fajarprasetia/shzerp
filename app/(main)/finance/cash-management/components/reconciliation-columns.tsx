"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";

interface Reconciliation {
  id: string;
  date: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: "pending" | "completed";
  notes?: string;
}

export const columns: ColumnDef<Reconciliation>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      return new Date(row.getValue("date")).toLocaleDateString();
    },
  },
  {
    accessorKey: "bankAccount.accountName",
    header: "Account",
  },
  {
    accessorKey: "statementBalance",
    header: "Statement Balance",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("statementBalance"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: row.original.bankAccount.currency,
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "bookBalance",
    header: "Book Balance",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("bookBalance"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: row.original.bankAccount.currency,
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "difference",
    header: "Difference",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("difference"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: row.original.bankAccount.currency,
      }).format(amount);

      return (
        <div className={`font-medium ${amount >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatted}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "completed" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const reconciliation = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(reconciliation.id)}
            >
              Copy reconciliation ID
            </DropdownMenuItem>
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Complete reconciliation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 