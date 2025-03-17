"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountForm } from "./account-form";
import { useToast } from "@/components/ui/use-toast";
import { FinancialAccount } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";

// Define required accounts with their proper structure
const REQUIRED_ACCOUNTS = [
  // Asset Accounts
  {
    name: "Cash",
    type: "ASSET",
    description: "Cash on hand and in bank",
    currency: "IDR",
    lowBalanceAlert: 1000000 // 1 million IDR
  },
  {
    name: "Accounts Receivable",
    type: "ASSET",
    description: "Amounts owed by customers",
    currency: "IDR"
  },
  {
    name: "Inventory",
    type: "ASSET",
    description: "Value of goods in stock",
    currency: "IDR"
  },
  // Liability Accounts
  {
    name: "Accounts Payable",
    type: "LIABILITY",
    description: "Amounts owed to vendors",
    currency: "IDR"
  },
  // Equity Accounts
  {
    name: "Retained Earnings",
    type: "EQUITY",
    description: "Accumulated earnings",
    currency: "IDR"
  },
  // Revenue Accounts
  {
    name: "Sales Revenue",
    type: "REVENUE",
    description: "Income from sales",
    currency: "IDR"
  },
  // Expense Accounts
  {
    name: "Cost of Goods Sold",
    type: "EXPENSE",
    description: "Direct cost of goods sold",
    currency: "IDR"
  },
];

export function ChartOfAccounts() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const columns: ColumnDef<FinancialAccount>[] = [
    {
      accessorKey: "name",
      header: "Account Name",
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return category ? category.replace(/_/g, " ") : "N/A";
      },
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue("balance"));
        return !isNaN(balance) ? formatCurrency(balance) : formatCurrency(0);
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAccount(account);
                setShowForm(true);
              }}
            >
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/finance/accounts");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch accounts");
      }
      const data = await response.json();
      setAccounts(data);

      // Check if required accounts exist
      const existingAccounts = new Set(data.map((acc: FinancialAccount) => acc.name));
      const missingAccounts = REQUIRED_ACCOUNTS.filter(
        (acc) => !existingAccounts.has(acc.name)
      );

      // Create missing required accounts
      if (missingAccounts.length > 0) {
        for (const account of missingAccounts) {
          await handleSubmit(account);
        }
        // Refresh the accounts list
        const updatedResponse = await fetch("/api/finance/accounts");
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setAccounts(updatedData);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (accountData: Partial<FinancialAccount>) => {
    try {
      const response = await fetch(
        selectedAccount
          ? `/api/finance/accounts/${selectedAccount.id}`
          : "/api/finance/accounts",
        {
          method: selectedAccount ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(accountData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save account");
      }

      const savedAccount = await response.json();

      setAccounts((prev) =>
        selectedAccount
          ? prev.map((acc) =>
              acc.id === savedAccount.id ? savedAccount : acc
            )
          : [...prev, savedAccount]
      );

      toast({
        title: "Success",
        description: `Account ${savedAccount.name} has been ${
          selectedAccount ? "updated" : "created"
        }.`,
      });

      setShowForm(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save account",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Chart of Accounts</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? "Edit Account" : "Create New Account"}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            initialData={selectedAccount}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="name"
        />
      </div>
    </div>
  );
} 