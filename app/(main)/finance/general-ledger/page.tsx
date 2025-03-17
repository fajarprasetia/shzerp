"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartOfAccounts } from "./components/chart-of-accounts";
import { JournalEntries } from "./components/journal-entries";
import { GeneralLedger } from "./components/general-ledger";
import { TrialBalance } from "./components/trial-balance";
import { withPermission } from "@/app/components/with-permission";

export default withPermission(GeneralLedgerPage, "finance", "read");

function GeneralLedgerPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">General Ledger</h1>
        <p className="text-muted-foreground">
          Manage your chart of accounts, journal entries, and view financial reports
        </p>
      </div>

      <Tabs defaultValue="chart-of-accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="journal-entries">
          <JournalEntries />
        </TabsContent>

        <TabsContent value="general-ledger">
          <GeneralLedger />
        </TabsContent>

        <TabsContent value="trial-balance">
          <TrialBalance />
        </TabsContent>
      </Tabs>
    </div>
  );
} 