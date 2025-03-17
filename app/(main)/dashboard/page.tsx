"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withPermission } from "@/app/components/with-permission";
import { toast } from "sonner";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { OverviewCards } from "./components/overview-cards";
import { FinanceSummary } from "./components/finance-summary";
import { RecentTransactions } from "./components/recent-transactions";

function DashboardPage() {
  const { 
    inventoryCount, 
    sales, 
    pendingTasks, 
    financeSummary,
    isLoading, 
    isError 
  } = useDashboardData();

  if (isError) {
    toast.error('Failed to load dashboard data', {
      description: 'Please try refreshing the page'
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your ERP dashboard
        </p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <OverviewCards
            inventoryCount={inventoryCount}
            sales={sales}
            pendingTasks={pendingTasks}
            isLoading={isLoading}
          />
          
          {/* Finance Summary */}
          {financeSummary && (
            <FinanceSummary
              totalRevenue={financeSummary.totalRevenue}
              totalExpenses={financeSummary.totalExpenses}
              netIncome={financeSummary.netIncome}
              cashBalance={financeSummary.cashBalance}
              accountsReceivable={financeSummary.accountsReceivable}
              accountsPayable={financeSummary.accountsPayable}
              isLoading={isLoading}
            />
          )}
          
          {/* Recent Transactions */}
          {financeSummary && (
            <div className="grid grid-cols-1 gap-4">
              <RecentTransactions
                transactions={financeSummary.recentTransactions || []}
                isLoading={isLoading}
              />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                View your business analytics and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Analytics content will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>
                Generate and view business reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Reports content will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withPermission(DashboardPage, "dashboard", "read"); 