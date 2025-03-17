"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccounts } from "./components/bank-accounts";
import { Transactions } from "./components/transactions";
import { Reconciliation } from "./components/reconciliation";
import { useSearchParams, useRouter } from "next/navigation";
import { withPermission } from "@/app/components/with-permission";

export default withPermission(CashManagementPage, "finance", "read");

function CashManagementPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState("accounts");

  useEffect(() => {
    // Set the active tab based on the URL parameter
    if (tabParam === "transactions" || tabParam === "reconciliation") {
      setActiveTab(tabParam);
    } else if (tabParam !== null && tabParam !== "accounts") {
      // If an invalid tab is specified, default to accounts
      router.replace("/finance/cash-management?tab=accounts");
    }
  }, [tabParam, router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/finance/cash-management?tab=${value}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Cash Management
        </h1>
        <p className="text-muted-foreground">
          Manage bank accounts, transactions, and reconciliation
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <BankAccounts />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Transactions />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Reconciliation />
        </TabsContent>
      </Tabs>
    </div>
  );
} 