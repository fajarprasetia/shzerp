"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withPermission } from "@/app/components/with-permission";
import { toast } from "sonner";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { OverviewCards } from "./components/overview-cards";
import { FinanceSummary } from "./components/finance-summary";
import { RecentTransactions } from "./components/recent-transactions";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
// Import our pre-initialized i18n instance
import i18nInstance from "@/app/i18n";
import { I18nProvider } from "./components/i18n-provider";

function DashboardPage() {
  // Use the pre-initialized i18n instance
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);
  const { 
    inventoryCount, 
    sales, 
    pendingTasks, 
    financeSummary,
    isLoading, 
    isError 
  } = useDashboardData();

  // Only show error toast after mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    
    if (isError && mounted) {
      toast.error(t('dashboard.error', 'Dashboard Error'), {
        description: t('dashboard.errorDesc', 'Failed to load dashboard data')
      });
    }
  }, [isError, mounted, t]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) return <div className="min-h-screen">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title', 'Dashboard')}</h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome', 'Welcome to your dashboard')}
        </p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboard.analytics', 'Analytics')}</TabsTrigger>
          <TabsTrigger value="reports">{t('dashboard.reports', 'Reports')}</TabsTrigger>
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
              <CardTitle>{t('dashboard.analytics', 'Analytics')}</CardTitle>
              <CardDescription>
                {t('dashboard.analyticsDesc', 'View your business analytics')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{t('dashboard.analyticsContent', 'Analytics content will appear here')}</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.reports', 'Reports')}</CardTitle>
              <CardDescription>
                {t('dashboard.reportsDesc', 'View and generate reports')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{t('dashboard.reportsContent', 'Reports content will appear here')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Wrap the exported component with I18nProvider
export default withPermission(
  function WrappedDashboardPage(props: any) {
    return (
      <I18nProvider>
        <DashboardPage {...props} />
      </I18nProvider>
    );
  },
  "dashboard", 
  "read"
); 