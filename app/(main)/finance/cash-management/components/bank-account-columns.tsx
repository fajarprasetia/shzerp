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

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: string;
  status: "active" | "inactive";
}

// Helper function to format currency based on type
const formatAccountCurrency = (amount: number, currency: string) => {
  switch (currency) {
    case 'IDR':
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        maximumFractionDigits: 0 
      }).format(amount).replace('Rp', 'Rp.');
    case 'RMB':
      return new Intl.NumberFormat('zh-CN', { 
        style: 'currency', 
        currency: 'CNY' 
      }).format(amount);
    case 'USD':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(amount);
    default:
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        maximumFractionDigits: 0 
      }).format(amount).replace('Rp', 'Rp.');
  }
};

export const columns: ColumnDef<BankAccount>[] = [
  {
    accessorKey: "accountName",
    header: "Account Name",
  },
  {
    accessorKey: "accountNumber",
    header: "Account Number",
  },
  {
    accessorKey: "bankName",
    header: "Bank Name",
  },
  {
    accessorKey: "currency",
    header: "Currency",
    cell: ({ row }) => {
      const currency = row.getValue("currency") as string;
      return <div className="font-medium">{currency}</div>;
    },
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("balance"));
      const currency = row.original.currency;
      const formatted = formatAccountCurrency(amount, currency);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "active" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const account = row.original;

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
              onClick={() => navigator.clipboard.writeText(account.id)}
            >
              Copy account ID
            </DropdownMenuItem>
            <DropdownMenuItem>View transactions</DropdownMenuItem>
            <DropdownMenuItem>Edit details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 