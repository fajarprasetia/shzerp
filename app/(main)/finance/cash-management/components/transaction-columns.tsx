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

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
}

// Format currency based on currency type
const formatCurrency = (amount: number, currency: string) => {
  switch (currency) {
    case 'IDR':
      return `Rp. ${amount.toLocaleString('id-ID')}`;
    case 'RMB':
      return `¥ ${amount.toLocaleString('zh-CN')}`;
    case 'USD':
      return `$ ${amount.toLocaleString('en-US')}`;
    default:
      // Default to IDR if currency is not specified
      return `Rp. ${amount.toLocaleString('id-ID')}`;
  }
};

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      return new Date(row.getValue("date")).toLocaleDateString();
    },
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "bankAccount.accountName",
    header: "Account",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <Badge variant={type === "credit" ? "default" : "destructive"}>
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const currency = row.original.bankAccount?.currency || 'IDR';
      const formatted = formatCurrency(amount, currency);

      return (
        <div className={`font-medium ${row.original.type === "credit" ? "text-green-600" : "text-red-600"}`}>
          {formatted}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;

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
              onClick={() => navigator.clipboard.writeText(transaction.id)}
            >
              Copy transaction ID
            </DropdownMenuItem>
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit transaction</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 