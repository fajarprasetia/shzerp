"use client";

import * as React from "react";
import { Download, AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface BudgetVarianceAnalysisProps {
  budgets: Budget[];
  transactions: Transaction[];
  onExport?: () => void;
}

interface CategoryVariance {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  trend: 'improving' | 'worsening' | 'stable';
  previousVariance: number;
}

export function BudgetVarianceAnalysis({
  budgets,
  transactions,
  onExport,
}: BudgetVarianceAnalysisProps) {
  const [period, setPeriod] = React.useState<string>("current");
  const [sortBy, setSortBy] = React.useState<string>("variance");
  
  // Define date ranges based on selected period
  const dateRange = React.useMemo(() => {
    const now = new Date();
    
    if (period === "current") {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        previous: {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        }
      };
    } else if (period === "last3") {
      return {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now),
        previous: {
          start: startOfMonth(subMonths(now, 5)),
          end: endOfMonth(subMonths(now, 3)),
        }
      };
    } else { // last6
      return {
        start: startOfMonth(subMonths(now, 5)),
        end: endOfMonth(now),
        previous: {
          start: startOfMonth(subMonths(now, 11)),
          end: endOfMonth(subMonths(now, 6)),
        }
      };
    }
  }, [period]);
  
  // Calculate variance for each category
  const categoryVariances = React.useMemo(() => {
    const variances: CategoryVariance[] = [];
    
    // Filter transactions and budgets for the selected period
    const periodTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { 
        start: dateRange.start, 
        end: dateRange.end 
      });
    });
    
    const previousPeriodTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { 
        start: dateRange.previous.start, 
        end: dateRange.previous.end 
      });
    });
    
    // Calculate variance for each budget category
    Object.keys(BUDGET_CATEGORIES).forEach(category => {
      // Current period calculations
      const categoryBudgets = budgets.filter(b => b.category === category);
      const budgeted = categoryBudgets.reduce((sum, b) => sum + b.amount, 0);
      
      const categoryTransactions = periodTransactions.filter(
        t => t.category === category && t.type === "expense"
      );
      const actual = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Previous period calculations
      const previousCategoryTransactions = previousPeriodTransactions.filter(
        t => t.category === category && t.type === "expense"
      );
      const previousActual = previousCategoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const previousVariance = budgeted - previousActual;
      
      // Calculate variance
      const variance = budgeted - actual;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
      
      // Determine trend
      let trend: 'improving' | 'worsening' | 'stable' = 'stable';
      if (Math.abs(variance - previousVariance) > budgeted * 0.05) { // 5% threshold for significance
        trend = variance > previousVariance ? 'improving' : 'worsening';
      }
      
      // Only add categories with budget or spending
      if (budgeted > 0 || actual > 0) {
        variances.push({
          category,
          budgeted,
          actual,
          variance,
          variancePercent,
          trend,
          previousVariance
        });
      }
    });
    
    // Sort variances based on selected sort method
    return variances.sort((a, b) => {
      if (sortBy === "variance") {
        return a.variance - b.variance; // Show worst variances first
      } else if (sortBy === "category") {
        return a.category.localeCompare(b.category);
      } else { // percent
        return a.variancePercent - b.variancePercent;
      }
    });
  }, [budgets, transactions, dateRange, sortBy]);
  
  // Calculate totals
  const totals = React.useMemo(() => {
    const totalBudgeted = categoryVariances.reduce((sum, v) => sum + v.budgeted, 0);
    const totalActual = categoryVariances.reduce((sum, v) => sum + v.actual, 0);
    const totalVariance = totalBudgeted - totalActual;
    const totalVariancePercent = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;
    
    // Count categories by status
    const overBudget = categoryVariances.filter(v => v.variance < 0).length;
    const nearBudget = categoryVariances.filter(v => v.variance >= 0 && v.variancePercent < 10).length;
    const underBudget = categoryVariances.filter(v => v.variancePercent >= 10).length;
    
    return {
      totalBudgeted,
      totalActual,
      totalVariance,
      totalVariancePercent,
      overBudget,
      nearBudget,
      underBudget,
      status: totalVariance >= 0 ? 'under' : 'over'
    };
  }, [categoryVariances]);
  
  // Prepare chart data
  const chartData = React.useMemo(() => {
    return categoryVariances
      .slice(0, 10) // Show top 10 categories
      .map(v => ({
        name: BUDGET_CATEGORIES[v.category]?.label || v.category,
        variance: Math.abs(v.variance), // Use absolute value for better visualization
        isNegative: v.variance < 0
      }));
  }, [categoryVariances]);
  
  // Generate recommendations based on variance analysis
  const recommendations = React.useMemo(() => {
    const recs = [];
    
    // Overall budget status
    if (totals.totalVariance < 0) {
      recs.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Overall Budget Deficit',
        description: `You're over budget by ${formatCurrency(Math.abs(totals.totalVariance))} (${Math.abs(totals.totalVariancePercent).toFixed(1)}%).`,
        action: 'Review your spending in the categories with the largest negative variances.'
      });
    } else if (totals.totalVariancePercent > 20) {
      recs.push({
        type: 'info',
        icon: TrendingDown,
        title: 'Significant Underspending',
        description: `You're under budget by ${formatCurrency(totals.totalVariance)} (${totals.totalVariancePercent.toFixed(1)}%).`,
        action: 'Consider reallocating funds to other priorities or adjusting future budgets.'
      });
    }
    
    // Categories with significant overspending
    const worstCategories = categoryVariances
      .filter(v => v.variance < 0 && v.variancePercent < -10)
      .slice(0, 3);
    
    if (worstCategories.length > 0) {
      recs.push({
        type: 'warning',
        icon: TrendingUp,
        title: 'Categories with Significant Overspending',
        description: `${worstCategories.map(v => BUDGET_CATEGORIES[v.category]?.label || v.category).join(', ')}`,
        action: 'Analyze these categories to identify unexpected expenses and adjust your budget accordingly.'
      });
    }
    
    // Categories with improving trends
    const improvingCategories = categoryVariances
      .filter(v => v.trend === 'improving')
      .slice(0, 3);
    
    if (improvingCategories.length > 0) {
      recs.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Improving Budget Performance',
        description: `${improvingCategories.map(v => BUDGET_CATEGORIES[v.category]?.label || v.category).join(', ')}`,
        action: 'Continue the strategies that have helped improve these categories.'
      });
    }
    
    // Categories with worsening trends
    const worseningCategories = categoryVariances
      .filter(v => v.trend === 'worsening')
      .slice(0, 3);
    
    if (worseningCategories.length > 0) {
      recs.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Worsening Budget Performance',
        description: `${worseningCategories.map(v => BUDGET_CATEGORIES[v.category]?.label || v.category).join(', ')}`,
        action: 'Investigate what changed in these categories and take corrective action.'
      });
    }
    
    return recs;
  }, [categoryVariances, totals]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budget Variance Analysis</h2>
          <p className="text-muted-foreground">
            Analyze budget performance and identify areas for improvement
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="last3">Last 3 Months</SelectItem>
              <SelectItem value="last6">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
          
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(
          totals.status === 'over' ? "border-red-200" : "border-green-200"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Budget Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              totals.status === 'over' ? "text-red-600" : "text-green-600"
            )}>
              {totals.status === 'over' ? 'Over Budget' : 'Under Budget'}
            </div>
            <p className="text-sm text-muted-foreground">
              {totals.status === 'over' 
                ? `Exceeding by ${formatCurrency(Math.abs(totals.totalVariance))}`
                : `Remaining ${formatCurrency(totals.totalVariance)}`
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories Over Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totals.overBudget}
            </div>
            <p className="text-sm text-muted-foreground">
              {((totals.overBudget / categoryVariances.length) * 100).toFixed(0)}% of categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories Near Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {totals.nearBudget}
            </div>
            <p className="text-sm text-muted-foreground">
              {((totals.nearBudget / categoryVariances.length) * 100).toFixed(0)}% of categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories Under Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totals.underBudget}
            </div>
            <p className="text-sm text-muted-foreground">
              {((totals.underBudget / categoryVariances.length) * 100).toFixed(0)}% of categories
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Variance by Category</CardTitle>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variance">Sort by Amount</SelectItem>
                  <SelectItem value="percent">Sort by Percentage</SelectItem>
                  <SelectItem value="category">Sort by Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              Comparison of budgeted amounts against actual spending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryVariances.map((variance) => (
                  <TableRow key={variance.category}>
                    <TableCell className="font-medium">
                      {BUDGET_CATEGORIES[variance.category]?.label || variance.category}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(variance.budgeted)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(variance.actual)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        variance.variance >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {formatCurrency(variance.variance)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        variance.variance >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {variance.variancePercent.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {variance.trend === 'improving' && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {variance.trend === 'worsening' && (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      {variance.trend === 'stable' && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.totalBudgeted)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.totalActual)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      totals.totalVariance >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(totals.totalVariance)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      totals.totalVariance >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {totals.totalVariancePercent.toFixed(1)}%
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Variances</CardTitle>
            <CardDescription>
              Categories with the largest budget variances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="variance" name="Variance Amount">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isNegative ? '#ef4444' : '#22c55e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Based on your budget performance, here are some recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={cn(
                  "p-4 rounded-lg border",
                  rec.type === 'warning' && "bg-yellow-50 border-yellow-200",
                  rec.type === 'success' && "bg-green-50 border-green-200",
                  rec.type === 'info' && "bg-blue-50 border-blue-200"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "mt-0.5 rounded-full p-1",
                    rec.type === 'warning' && "bg-yellow-100 text-yellow-600",
                    rec.type === 'success' && "bg-green-100 text-green-600",
                    rec.type === 'info' && "bg-blue-100 text-blue-600"
                  )}>
                    <rec.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    <p className="text-sm font-medium mt-2">Recommendation: {rec.action}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {recommendations.length === 0 && (
              <p className="text-muted-foreground">
                No specific recommendations at this time. Your budget is on track!
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            These recommendations are based on your historical spending patterns and budget allocations.
            Review them regularly to maintain financial health.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 