"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentTracking from "./components/payment-tracking";
import { AgingReport } from "./components/aging-report";
import { Collections } from "./components/collections";
import { withPermission } from "@/app/components/with-permission";

export default withPermission(AccountsReceivablePage, "finance", "read");

function AccountsReceivablePage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "payments";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Accounts Receivable
        </h1>
        <p className="text-muted-foreground">
          Manage customer payments, track aging accounts, and handle collections
        </p>
      </div>

      <Tabs defaultValue={tab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payments Received</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <PaymentTracking />
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <AgingReport />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <Collections />
        </TabsContent>
      </Tabs>
    </div>
  );
} 