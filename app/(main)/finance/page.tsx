"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";
import { PaymentsTable } from "./components/payments-table";
import { FinanceDashboard } from "./components/finance-dashboard";
import { RecentPayments } from "./components/recent-payments";
import { ReportsGrid } from "./components/reports-grid";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PlusCircle, CreditCard, FileText, BarChart3 } from "lucide-react";

export default withPermission(FinancePage, "finance", "read");

function FinancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleRecordPayment = () => {
    // Navigate to the payment form
    router.push("/finance/payments/new");
  };

  const handleCashManagementClick = () => {
    router.push("/finance/cash-management");
  };

  const handleGeneralLedgerClick = () => {
    router.push("/finance/general-ledger");
  };

  const handleAccountsReceivableClick = () => {
    router.push("/finance/accounts-receivable");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Finance Overview</h1>
        <PermissionGate resource="finance" action="create">
          <Button onClick={handleRecordPayment}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </PermissionGate>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FinanceDashboard />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCashManagementClick}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Cash Management</CardTitle>
                <CardDescription>Manage bank accounts and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <CreditCard className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleGeneralLedgerClick}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">General Ledger</CardTitle>
                <CardDescription>View your chart of accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <FileText className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleAccountsReceivableClick}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Accounts Receivable</CardTitle>
                <CardDescription>Manage customer payments</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart3 className="h-8 w-8 text-primary" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid gap-6 md:grid-cols-7">
            <Card className="md:col-span-5">
              <CardHeader>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>
                  View and manage all payment records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable />
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>
                  Latest payment activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentPayments />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("payments")}>
                  View All Payments
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <ReportsGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
} 