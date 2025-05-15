"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate } from "@/app/components/permission-gate";
import { formatCurrency } from "../utils/format-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, CheckSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

interface OverviewCardsProps {
  inventoryCount: {
    stock: number;
    divided: number;
    total: number;
  };
  sales: {
    revenue: number;
    orderCount: number;
  };
  pendingTasks: number;
  isLoading: boolean;
}

export function OverviewCards({
  inventoryCount,
  sales,
  pendingTasks,
  isLoading,
}: OverviewCardsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  // Example trend data (replace with real data if available)
  const inventoryTrend = 5; // +5 items this month
  const salesTrend = 12; // +12% revenue
  const tasksTrend = -2; // -2 tasks vs last week

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <PermissionGate resource="inventory" action="read">
        <Card
          className="glassmorph hover:shadow-lg transition cursor-pointer border border-gray-200/60 backdrop-blur-md bg-white/60 dark:bg-gray-900/60"
          onClick={() => router.push('/inventory/stock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.cards.inventory')}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{inventoryCount.total}</div>
            )}
            <div className="flex flex-col space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.cards.itemsInStock')}
              </p>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t('dashboard.cards.stock')}: {inventoryCount.stock}</span>
                <span>{t('dashboard.cards.divided')}: {inventoryCount.divided}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-semibold ${inventoryTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{inventoryTrend >= 0 ? '+' : ''}{inventoryTrend}</span>
                <span className="text-xs text-muted-foreground">{t('dashboard.cards.trend', 'this month')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
      
      <PermissionGate resource="sales" action="read">
        <Card
          className="glassmorph hover:shadow-lg transition cursor-pointer border border-gray-200/60 backdrop-blur-md bg-white/60 dark:bg-gray-900/60"
          onClick={() => router.push('/sales/orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.cards.sales')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(sales.revenue)}</div>
            )}
            <div className="flex flex-col space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.cards.revenueThisMonth')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.cards.orders')}: {sales.orderCount}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-semibold ${salesTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{salesTrend >= 0 ? '+' : ''}{salesTrend}%</span>
                <span className="text-xs text-muted-foreground">{t('dashboard.cards.trend', 'vs last month')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
      
      <PermissionGate resource="tasks" action="read">
        <Card
          className="glassmorph hover:shadow-lg transition cursor-pointer border border-gray-200/60 backdrop-blur-md bg-white/60 dark:bg-gray-900/60"
          onClick={() => router.push('/tasks')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.cards.tasks')}
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{pendingTasks}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('dashboard.cards.pendingTasks')}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs font-semibold ${tasksTrend <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{tasksTrend > 0 ? '+' : ''}{tasksTrend}</span>
              <span className="text-xs text-muted-foreground">{t('dashboard.cards.trend', 'vs last week')}</span>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
    </div>
  );
} 