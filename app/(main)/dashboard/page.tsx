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
import { useEffect, useState, useMemo } from "react";
// Import our pre-initialized i18n instance
import i18nInstance from "@/app/i18n";
import { I18nProvider } from "./components/i18n-provider";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });

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
  const [recentOrders, setRecentOrders] = useState([]);

  // Only show error toast after mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    
    if (isError && mounted) {
      toast.error(t('dashboard.error', 'Dashboard Error'), {
        description: t('dashboard.errorDesc', 'Failed to load dashboard data')
      });
    }
  }, [isError, mounted, t]);

  useEffect(() => {
    if (!mounted) return;
    // Fetch recent orders for the last 7 days
    const fetchRecentOrders = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const response = await fetch(`/api/sales/orders`);
        if (!response.ok) throw new Error("Failed to fetch orders");
        const allOrders = await response.json();
        // Filter orders from the last 7 days
        const filtered = allOrders.filter((order: any) => new Date(order.createdAt) >= sevenDaysAgo);
        // Sort by createdAt desc
        filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentOrders(filtered);
      } catch (error) {
        setRecentOrders([]);
      }
    };
    fetchRecentOrders();
  }, [mounted]);

  // Analytics data processing
  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const map: Record<string, number> = {};
    days.forEach(day => { map[day] = 0; });
    recentOrders.forEach(order => {
      const day = new Date(order.createdAt).toISOString().slice(0, 10);
      if (map[day] !== undefined) map[day] += order.totalAmount;
    });
    return days.map(day => ({ date: day, sales: map[day] }));
  }, [recentOrders]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recentOrders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [recentOrders]);

  const totalSales = useMemo(() => recentOrders.reduce((sum, o) => sum + o.totalAmount, 0), [recentOrders]);
  const orderCount = recentOrders.length;
  const avgOrderValue = orderCount ? totalSales / orderCount : 0;

  // Reports: CSV export helpers
  function exportOrdersCSV() {
    if (!recentOrders.length) return;
    const header = Object.keys(recentOrders[0]).join(",");
    const rows = recentOrders.map(o => Object.values(o).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <RecentTransactions
            transactions={recentOrders}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-4 shadow">
              <h3 className="font-semibold mb-2">{t('dashboard.analytics.salesLast30Days', 'Sales Revenue (Last 30 Days)')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => v.toLocaleString('id-ID')} width={60} />
                  <Tooltip formatter={v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(v))} />
                  <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-4 shadow flex flex-col items-center">
              <h3 className="font-semibold mb-2">{t('dashboard.analytics.orderStatus', 'Order Status Distribution')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {statusCounts.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={["#2563eb", "#22c55e", "#f59e42", "#ef4444"][idx % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-4 w-full">
                <span className="text-sm">{t('dashboard.analytics.totalSales', 'Total Sales')}: <b>{totalSales.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</b></span>
                <span className="text-sm">{t('dashboard.analytics.orderCount', 'Order Count')}: <b>{orderCount}</b></span>
                <span className="text-sm">{t('dashboard.analytics.avgOrderValue', 'Avg. Order Value')}: <b>{avgOrderValue.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</b></span>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Button variant="outline" onClick={exportOrdersCSV}>{t('dashboard.reports.exportOrders', 'Export Orders CSV')}</Button>
            {/* <Button variant="outline" onClick={exportFinanceCSV}>{t('dashboard.reports.exportFinance', 'Export Finance CSV')}</Button> */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-4 shadow">
              <h3 className="font-semibold mb-2">{t('dashboard.reports.lastOrders', 'Last 10 Orders')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left">No</th>
                      <th className="text-left">Order No</th>
                      <th className="text-left">Customer</th>
                      <th className="text-right">Total</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.slice(0, 10).map((order, idx) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td>{idx + 1}</td>
                        <td>{order.orderNo}</td>
                        <td>{order.customer?.name}</td>
                        <td className="text-right">{order.totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                        <td>{order.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Finance transactions preview can be added here if available */}
            <div className="bg-white/70 dark:bg-gray-900/70 rounded-lg p-4 shadow">
              <h3 className="font-semibold mb-2">{t('dashboard.reports.lastFinance', 'Last 10 Finance Transactions')}</h3>
              <div className="text-muted-foreground text-xs">(Not implemented: connect to finance data source)</div>
            </div>
          </div>
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