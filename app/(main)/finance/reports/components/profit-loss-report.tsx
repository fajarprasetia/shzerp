"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Transaction, BUDGET_CATEGORIES } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

interface ProfitLossReportProps {
  transactions: Transaction[];
  period: string;
  onExport: () => void;
}

interface CategoryTotal {
  category: string;
  income: number;
  expense: number;
}

export function ProfitLossReport({
  transactions,
  period,
  onExport,
}: ProfitLossReportProps) {
  const [currentPeriodTotals, setCurrentPeriodTotals] = React.useState<CategoryTotal[]>([]);
  const [previousPeriodTotals, setPreviousPeriodTotals] = React.useState<CategoryTotal[]>([]);

  React.useEffect(() => {
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const previousStart = startOfMonth(subMonths(now, 1));
    const previousEnd = endOfMonth(subMonths(now, 1));

    const calculateTotals = (start: Date, end: Date) => {
      const filteredTransactions = transactions?.filter(
        (t) => new Date(t.date) >= start && new Date(t.date) <= end
      ) || [];

      const totals: { [key: string]: CategoryTotal } = {};

      Object.keys(BUDGET_CATEGORIES).forEach((category) => {
        totals[category] = {
          category,
          income: 0,
          expense: 0,
        };
      });

      filteredTransactions.forEach((transaction) => {
        const total = totals[transaction.category];
        if (transaction.type === "income") {
          total.income += transaction.amount;
        } else if (transaction.type === "expense") {
          total.expense += transaction.amount;
        }
      });

      return Object.values(totals);
    };

    setCurrentPeriodTotals(calculateTotals(currentStart, currentEnd));
    setPreviousPeriodTotals(calculateTotals(previousStart, previousEnd));
  }, [transactions, period]);

  const calculateSummary = (totals: CategoryTotal[]) => {
    return totals.reduce(
      (acc, curr) => ({
        totalIncome: acc.totalIncome + curr.income,
        totalExpenses: acc.totalExpenses + curr.expense,
      }),
      { totalIncome: 0, totalExpenses: 0 }
    );
  };

  const currentSummary = calculateSummary(currentPeriodTotals);
  const previousSummary = calculateSummary(previousPeriodTotals);

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentSummary.totalIncome)}
            </div>
            <p className={`text-xs ${
              calculateGrowth(currentSummary.totalIncome, previousSummary.totalIncome) >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}>
              {calculateGrowth(
                currentSummary.totalIncome,
                previousSummary.totalIncome
              ).toFixed(1)}
              % from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentSummary.totalExpenses)}
            </div>
            <p className={`text-xs ${
              calculateGrowth(currentSummary.totalExpenses, previousSummary.totalExpenses) <= 0
                ? "text-green-500"
                : "text-red-500"
            }`}>
              {calculateGrowth(
                currentSummary.totalExpenses,
                previousSummary.totalExpenses
              ).toFixed(1)}
              % from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentSummary.totalIncome - currentSummary.totalExpenses)}
            </div>
            <p className={`text-xs ${
              currentSummary.totalIncome - currentSummary.totalExpenses >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}>
              {((currentSummary.totalIncome - currentSummary.totalExpenses) /
                currentSummary.totalIncome *
                100).toFixed(1)}
              % profit margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operating Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((currentSummary.totalExpenses / currentSummary.totalIncome) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Expenses to Income Ratio
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Profit & Loss Statement</CardTitle>
            <CardDescription>
              Detailed breakdown by category for the current period
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPeriodTotals.map((total) => (
                <TableRow key={total.category}>
                  <TableCell className="font-medium">
                    {BUDGET_CATEGORIES[total.category as keyof typeof BUDGET_CATEGORIES]?.label}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(total.income)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(total.expense)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      total.income - total.expense >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(total.income - total.expense)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(currentSummary.totalIncome)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(currentSummary.totalExpenses)}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    currentSummary.totalIncome - currentSummary.totalExpenses >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(
                    currentSummary.totalIncome - currentSummary.totalExpenses
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 