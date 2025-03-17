"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  balance: number;
  lastUpdated: Date;
}

export default function AccountBalancesPage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/finance/accounts/balances");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch account balances");
      }
      
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching account balances:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch account balances",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const columns: ColumnDef<AccountBalance>[] = [
    {
      accessorKey: "code",
      header: "Account Code",
    },
    {
      accessorKey: "name",
      header: "Account Name",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant="outline">
            {type.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return (
          <Badge variant="secondary">
            {category.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue("balance"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(balance);
        return formatted;
      },
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("lastUpdated"));
        return date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Account Balances</h2>
        <p className="text-muted-foreground">
          View and monitor all account balances in real-time
        </p>
      </div>
      
      <DataTable
        columns={columns}
        data={accounts}
        searchKey="name"
      />
    </div>
  );
} 