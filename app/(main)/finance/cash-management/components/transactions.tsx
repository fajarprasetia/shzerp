"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./transaction-columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionForm } from "./transaction-form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";

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

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/finance/transactions", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Failed to load transactions");
      toast({
        title: "Error",
        description: "Failed to load transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalIncome = transactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  // Format currency with Rp. prefix for IDR
  const formatRupiah = (amount: number) => {
    return `Rp. ${amount.toLocaleString('id-ID')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Error loading transactions"
          description="We encountered a problem while loading your transactions."
          icon="alertTriangle"
          action={{
            label: "Try Again",
            onClick: fetchTransactions,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatRupiah(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatRupiah(totalIncome - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Add New Transaction</DialogTitle>
            <TransactionForm onSuccess={() => {
              setFormOpen(false);
              fetchTransactions();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="You haven't recorded any transactions yet. Add your first transaction to get started."
          icon="receipt"
          action={{
            label: "Add Transaction",
            onClick: () => setFormOpen(true),
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          loading={loading}
        />
      )}
    </div>
  );
} 