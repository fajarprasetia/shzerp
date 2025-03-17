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
import { Progress } from "@/components/ui/progress";
import { Budget, Transaction, BUDGET_CATEGORIES } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BudgetReportProps {
  budgets: Budget[];
  transactions: Transaction[];
  period: string;
  onExport: () => void;
}

interface BudgetAnalysis {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  progress: number;
}

export function BudgetReport({
  budgets,
  transactions,
  period,
  onExport,
}: BudgetReportProps) {
  const budgetAnalysis = React.useMemo(() => {
    const analysis: BudgetAnalysis[] = [];

    Object.keys(BUDGET_CATEGORIES).forEach((category) => {
      const categoryBudgets = budgets?.filter(
        (b) => b.category === category
      ) || [];
      const budgeted = categoryBudgets.reduce((sum, b) => sum + b.amount, 0);

      const categoryTransactions = transactions?.filter(
        (t) => t.category === category && t.type === "expense"
      ) || [];
      const actual = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

      const variance = budgeted - actual;
      const progress = budgeted > 0 ? (actual / budgeted) * 100 : 0;

      analysis.push({
        category,
        budgeted,
        actual,
        variance,
        progress,
      });
    });

    return analysis.filter((a) => a.budgeted > 0 || a.actual > 0);
  }, [budgets, transactions]);

  const totalBudgeted = budgetAnalysis.reduce((sum, a) => sum + a.budgeted, 0);
  const totalActual = budgetAnalysis.reduce((sum, a) => sum + a.actual, 0);
  const totalVariance = totalBudgeted - totalActual;
  const overallProgress = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-red-500";
    if (progress >= 90) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBudgeted)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalActual)}
            </div>
            <Progress
              value={overallProgress}
              className={cn("h-2", getProgressColor(overallProgress))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalVariance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(totalVariance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallProgress.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>
              Comparison of budgeted amounts against actual spending
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
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetAnalysis.map((analysis) => (
                <TableRow key={analysis.category}>
                  <TableCell className="font-medium">
                    {BUDGET_CATEGORIES[analysis.category as keyof typeof BUDGET_CATEGORIES]?.label}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(analysis.budgeted)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(analysis.actual)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      analysis.variance >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(analysis.variance)}
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="space-y-1">
                      <Progress
                        value={analysis.progress}
                        className={cn("h-2", getProgressColor(analysis.progress))}
                      />
                      <p className="text-sm text-muted-foreground">
                        {analysis.progress.toFixed(1)}% used
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalBudgeted)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalActual)}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    totalVariance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totalVariance)}
                </TableCell>
                <TableCell className="w-[200px]">
                  <div className="space-y-1">
                    <Progress
                      value={overallProgress}
                      className={cn("h-2", getProgressColor(overallProgress))}
                    />
                    <p className="text-sm text-muted-foreground">
                      {overallProgress.toFixed(1)}% used
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 