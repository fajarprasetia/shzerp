"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorBills } from "./components/vendor-bills";
import { PaymentTracking } from "./components/payment-tracking";
import { AgingReport } from "./components/aging-report";
import { useRouter, useSearchParams } from "next/navigation";
import { withPermission } from "@/app/components/with-permission";

export default withPermission(AccountsPayablePage, "finance", "read");

function AccountsPayablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "bills";

  const handleTabChange = (value: string) => {
    router.push(`/finance/accounts-payable?tab=${value}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Accounts Payable
        </h1>
        <p className="text-muted-foreground">
          Manage vendor bills, payments, and track aging accounts
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">Vendor Bills</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="space-y-4">
          <VendorBills />
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <PaymentTracking />
        </TabsContent>
        <TabsContent value="aging" className="space-y-4">
          <AgingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
} 