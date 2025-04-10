"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxSettings } from "./components/tax-settings";
import { TaxCalculator } from "./components/tax-calculator";
import { TaxFiling } from "./components/tax-filing";
import { withPermission } from "@/app/components/with-permission";

function TaxManagementPage() {
  const [activeTab, setActiveTab] = React.useState("settings");

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tax Management</h1>
        <p className="text-muted-foreground">
          Manage tax settings, calculate taxes, and prepare tax filings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Tax Settings</TabsTrigger>
          <TabsTrigger value="calculator">Tax Calculator</TabsTrigger>
          <TabsTrigger value="filing">Tax Filing</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <TaxSettings />
        </TabsContent>

        <TabsContent value="calculator">
          <TaxCalculator />
        </TabsContent>

        <TabsContent value="filing">
          <TaxFiling />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withPermission(TaxManagementPage, "finance", "read"); 