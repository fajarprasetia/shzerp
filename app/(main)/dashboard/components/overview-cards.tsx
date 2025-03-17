"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate } from "@/app/components/permission-gate";
import { formatCurrency } from "../utils/format-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, CheckSquare } from "lucide-react";

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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <PermissionGate resource="inventory" action="read">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory
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
                Items in stock
              </p>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Stock: {inventoryCount.stock}</span>
                <span>Divided: {inventoryCount.divided}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
      
      <PermissionGate resource="sales" action="read">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sales
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
                Revenue this month
              </p>
              <p className="text-xs text-muted-foreground">
                Orders: {sales.orderCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
      
      <PermissionGate resource="tasks" action="read">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks
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
              Pending tasks
            </p>
          </CardContent>
        </Card>
      </PermissionGate>
    </div>
  );
} 