"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { TransactionList } from "../components/transaction-list";
import { TransactionForm } from "../components/transaction-form";
import { useTransactions } from "../hooks/use-transactions";

export default function TransactionsPage() {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const { transactions, isLoading, mutate } = useTransactions();

  const handleSuccess = () => {
    setAddDialogOpen(false);
    mutate();
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <Button onClick={() => setAddDialogOpen(true)} className="glass glass-hover">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
          <DialogContent className="glass sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
            </DialogHeader>
            <TransactionForm
              onSuccess={handleSuccess}
              onCancel={() => setAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass rounded-lg border border-white/20 dark:border-gray-800/20">
        {isLoading ? (
          <div className="p-8 text-center">Loading transactions...</div>
        ) : (
          <TransactionList
            transactions={transactions}
            onSelect={(transaction) => {
              // TODO: Implement transaction details/edit view
              console.log("Selected transaction:", transaction);
            }}
          />
        )}
      </div>
    </div>
  );
} 