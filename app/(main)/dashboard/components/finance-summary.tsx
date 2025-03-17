"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../utils/format-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/app/components/permission-gate";
import { TrendingUp, TrendingDown, Wallet, CreditCard, AlertCircle, DollarSign, ReceiptText } from "lucide-react";

interface FinanceSummaryProps {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  isLoading: boolean;
}

export function FinanceSummary({
  totalRevenue,
  totalExpenses,
  netIncome,
  cashBalance,
  accountsReceivable,
  accountsPayable,
  isLoading,
}: FinanceSummaryProps) {
  return (
    <PermissionGate resource="finance" action="read">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Income from sales and services
            </p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Costs and operational expenses
            </p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Income
            </CardTitle>
            {netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-500" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className={`text-2xl font-bold ${netIncome < 0 ? 'text-rose-500' : ''}`}>
                {formatCurrency(netIncome)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(cashBalance)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Available funds in bank accounts
            </p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accounts Receivable
            </CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(accountsReceivable)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Money owed by customers
            </p>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accounts Payable
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(accountsPayable)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Money owed to vendors
            </p>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
} 