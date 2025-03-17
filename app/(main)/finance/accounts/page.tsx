"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AccountList } from "./components/account-list";
import { AccountForm } from "./components/account-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccounts } from "../hooks/use-accounts";

export default function AccountsPage() {
  const [isAddingAccount, setIsAddingAccount] = React.useState(false);
  const { accounts, isLoading, mutate } = useAccounts();
  const [selectedAccount, setSelectedAccount] = React.useState(null);

  const handleSuccess = () => {
    setIsAddingAccount(false);
    setSelectedAccount(null);
    mutate();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your financial accounts and track balances
          </p>
        </div>
        <Button onClick={() => setIsAddingAccount(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Balance</CardTitle>
            <CardDescription>Across all active accounts</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {accounts?.reduce((sum, acc) => sum + (acc.isActive ? acc.balance : 0), 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Accounts</CardTitle>
            <CardDescription>Number of active accounts</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {accounts?.filter(acc => acc.isActive).length || 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last Updated</CardTitle>
            <CardDescription>Most recent account update</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {accounts?.length > 0
              ? new Date(
                  Math.max(...accounts.map(acc => new Date(acc.updatedAt).getTime()))
                ).toLocaleDateString()
              : "-"}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <AccountList
          accounts={accounts || []}
          isLoading={isLoading}
          onSelect={setSelectedAccount}
        />
      </div>

      <Dialog
        open={isAddingAccount || !!selectedAccount}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingAccount(false);
            setSelectedAccount(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            account={selectedAccount}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAddingAccount(false);
              setSelectedAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 