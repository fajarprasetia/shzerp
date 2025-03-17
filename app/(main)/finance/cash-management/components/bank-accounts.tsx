"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./bank-account-columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BankAccountForm } from "./bank-account-form";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: string;
  status: "active" | "inactive";
}

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/finance/bank-accounts", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      setError("Failed to load bank accounts");
      toast({
        title: "Error",
        description: "Failed to load bank accounts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/bank-accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });
      
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting bank account:", error);
      toast({
        title: "Error",
        description: "Failed to delete bank account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccountToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

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

  // Calculate total balance (note: this is simplified and doesn't handle currency conversion)
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const activeAccounts = accounts.filter(a => a.status === "active").length;

  // Filter out any existing actions column from the imported columns
  const baseColumns = columns.filter(column => column.id !== "actions");

  const enhancedColumns = [
    ...baseColumns,
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setAccountToDelete(account.id);
                  setDeleteDialogOpen(true);
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

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
          title="Error loading bank accounts"
          description="We encountered a problem while loading your bank accounts."
          icon="alertTriangle"
          action={{
            label: "Try Again",
            onClick: fetchAccounts,
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
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAccountCurrency(totalBalance, 'IDR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined balance across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAccounts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total number of active bank accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Bank Accounts</h2>
        <Dialog 
          open={formOpen} 
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingAccount(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>
              {editingAccount ? "Edit Bank Account" : "Add New Bank Account"}
            </DialogTitle>
            <BankAccountForm 
              account={editingAccount} 
              onSuccess={() => {
                setFormOpen(false);
                setEditingAccount(null);
                fetchAccounts();
                toast({
                  title: "Success",
                  description: editingAccount 
                    ? "Bank account updated successfully" 
                    : "Bank account created successfully",
                });
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="No bank accounts found"
          description="You haven't added any bank accounts yet. Add your first account to get started."
          icon="bankNote"
          action={{
            label: "Add Account",
            onClick: () => setFormOpen(true),
          }}
        />
      ) : (
        <DataTable
          columns={enhancedColumns}
          data={accounts}
          loading={loading}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bank account
              and all associated transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => accountToDelete && handleDeleteAccount(accountToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 