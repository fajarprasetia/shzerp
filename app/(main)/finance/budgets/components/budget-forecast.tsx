"use client";

import * as React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Budget, Transaction } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { addMonths, format, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth } from "date-fns";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.budgets.forecast.title': '预算预测',
  'finance.budgets.forecast.subtitle': '查看预算使用情况和预测',
  'finance.budgets.forecast.actual': '实际',
  'finance.budgets.forecast.projected': '预测',
  'finance.budgets.forecast.budget': '预算',
  'finance.budgets.forecast.noData': '没有可用的预算数据',
  'common.loading': '加载中...'
};

// Global translation function that completely bypasses i18n for Chinese
const forcedTranslate = (key: string, defaultValue: string, language: string, params?: Record<string, any>): string => {
  // For Chinese, use our hardcoded map
  if (language === 'zh' && key in ZH_TRANSLATIONS) {
    let translation = ZH_TRANSLATIONS[key];
    
    // Handle parameter substitution
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, String(value));
      });
    }
    
    console.log(`Forced budget forecast translation for ${key}: ${translation}`);
    return translation;
  }
  
  // Check if we have translations in the window object
  if (language === 'zh' && typeof window !== 'undefined' && window.__financeTranslations && window.__financeTranslations[key]) {
    let translation = window.__financeTranslations[key];
    
    // Handle parameter substitution
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, String(value));
      });
    }
    
    return translation;
  }
  
  // Fallback to default value
  return defaultValue;
};

interface BudgetForecastProps {
  budgets: Budget[];
  transactions: Transaction[];
}

interface ForecastData {
  name: string;
  actual: number;
  projected: number;
  budget: number;
}

export function BudgetForecast({ budgets, transactions }: BudgetForecastProps) {
  // Place all useState hooks at the top
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [forecastMonths, setForecastMonths] = React.useState<number>(6);
  const [mounted, setMounted] = useState(false);
  
  // Place all other hooks next
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };

  // Always define all useMemo hooks, regardless of mounted state
  const forecastData = React.useMemo(() => {
    if (!mounted) {
      return []; // Return empty array if not mounted
    }

    // Get current date and create date range for past 6 months and future forecast months
    const currentDate = new Date();
    const startDate = addMonths(startOfMonth(currentDate), -6);
    const endDate = addMonths(endOfMonth(currentDate), forecastMonths);
    
    // Generate array of months
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    // Filter transactions and budgets by selected category
    const filteredTransactions = selectedCategory === "all" 
      ? transactions 
      : transactions.filter(t => t.category === selectedCategory && t.type === "expense");
    
    const filteredBudgets = selectedCategory === "all"
      ? budgets
      : budgets.filter(b => b.category === selectedCategory);
    
    // Calculate monthly spending for past months
    const monthlySpending = months.map(month => {
      const monthTransactions = filteredTransactions.filter(t => 
        isSameMonth(new Date(t.date), month)
      );
      
      const spent = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Get budget for this month
      const monthBudget = filteredBudgets.reduce((sum, budget) => {
        const budgetStart = new Date(budget.startDate);
        const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;
        
        // Check if this month falls within the budget period
        if (budgetEnd) {
          // For custom period budgets with end date
          if (month >= budgetStart && month <= budgetEnd) {
            return sum + budget.amount;
          }
        } else {
          // For recurring budgets without end date, check period type
          const isRecurring = budget.period === 'monthly' || budget.period === 'quarterly' || budget.period === 'yearly';
          
          if (isRecurring && month >= budgetStart) {
            // For monthly budgets
            if (budget.period === 'monthly') {
              return sum + budget.amount;
            }
            
            // For quarterly budgets
            if (budget.period === 'quarterly') {
              const monthDiff = (month.getFullYear() - budgetStart.getFullYear()) * 12 + month.getMonth() - budgetStart.getMonth();
              if (monthDiff % 3 === 0) {
                return sum + budget.amount;
              }
            }
            
            // For yearly budgets
            if (budget.period === 'yearly') {
              const monthDiff = (month.getFullYear() - budgetStart.getFullYear()) * 12 + month.getMonth() - budgetStart.getMonth();
              if (monthDiff % 12 === 0) {
                return sum + budget.amount;
              }
            }
          }
        }
        
        return sum;
      }, 0);
      
      return {
        month,
        spent,
        budget: monthBudget
      };
    });
    
    // Calculate average monthly spending from past data
    const pastMonths = monthlySpending.slice(0, 6);
    const avgMonthlySpending = pastMonths.reduce((sum, m) => sum + m.spent, 0) / pastMonths.length;
    
    // Generate forecast data
    return months.map((month, index) => {
      const isProjected = month > currentDate;
      const monthData = monthlySpending[index];
      
      // For projected months, use average spending with a slight increase
      // This is a simple linear projection - could be enhanced with more sophisticated algorithms
      const growthRate = 1.02; // 2% monthly growth in spending
      const projectedSpending = isProjected 
        ? avgMonthlySpending * Math.pow(growthRate, index - 6)
        : 0;
      
      return {
        name: format(month, "MMM yyyy"),
        actual: isProjected ? 0 : monthData.spent,
        projected: isProjected ? projectedSpending : 0,
        budget: monthData.budget
      };
    });
  }, [mounted, budgets, transactions, selectedCategory, forecastMonths]);
  
  // Calculate budget surplus/deficit for the forecast period
  const forecastSummary = React.useMemo(() => {
    if (!mounted) {
      return { totalProjected: 0, totalBudgeted: 0, surplus: 0, months: 0 }; // Return default if not mounted
    }
    
    const projectedMonths = forecastData.filter(d => d.projected > 0);
    
    const totalProjected = projectedMonths.reduce((sum, d) => sum + d.projected, 0);
    const totalBudgeted = projectedMonths.reduce((sum, d) => sum + d.budget, 0);
    const surplus = totalBudgeted - totalProjected;
    
    return {
      totalProjected,
      totalBudgeted,
      surplus,
      months: projectedMonths.length
    };
  }, [mounted, forecastData]);
  
  // Add translations when component mounts - always defined, never conditional
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    
    if (language === 'zh') {
      console.log('Ensuring Chinese translations for Budget Forecast');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            budgets: {
              forecast: {
                title: '预算预测',
                subtitle: '查看预算使用情况和预测',
                actual: '实际',
                projected: '预测',
                budget: '预算',
                noData: '没有可用的预算数据'
              }
            }
          }
        });
        console.log('Added budget forecast translations for zh');
      } catch (e) {
        console.error('Error adding budget forecast translations:', e);
      }
    }
  }, [mounted, language, i18nInstance]);

  // Loading placeholder - moved after all hooks
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }
  
  // Main render function - after all hooks have been called
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{safeT('finance.budgets.forecast.title', 'Budget Forecast')}</CardTitle>
            <CardDescription>
              {safeT('finance.budgets.forecast.subtitle', 'Projected spending based on historical data')}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {budgets
                  .map(b => b.category)
                  .filter((c, i, arr) => arr.indexOf(c) === i)
                  .map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            <Select
              value={forecastMonths.toString()}
              onValueChange={(value) => setForecastMonths(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Forecast period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Spending"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    name="Projected Spending"
                    stroke="#82ca9d"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    name="Budget Limit"
                    stroke="#ff7300"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Total Projected Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(forecastSummary.totalProjected)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Next {forecastSummary.months} months
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(forecastSummary.totalBudgeted)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Next {forecastSummary.months} months
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Projected Surplus/Deficit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${forecastSummary.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(forecastSummary.surplus)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {forecastSummary.surplus >= 0 ? 'Surplus' : 'Deficit'} over forecast period
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="summary">
            <div className="space-y-4">
              <div className="rounded-md border">
                <div className="p-4">
                  <h3 className="text-lg font-medium">Forecast Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your spending patterns over the last 6 months, here's what we project for the next {forecastMonths} months:
                  </p>
                </div>
                
                <div className="p-4 border-t">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Projected Monthly Spending</h4>
                      <p className="text-sm text-muted-foreground">
                        Your average monthly spending is projected to be approximately {formatCurrency(forecastSummary.totalProjected / forecastSummary.months)}.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Budget Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {forecastSummary.surplus >= 0 
                          ? `You are projected to stay within budget with a surplus of ${formatCurrency(forecastSummary.surplus)}.`
                          : `You are projected to exceed your budget by ${formatCurrency(Math.abs(forecastSummary.surplus))}.`
                        }
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Recommendations</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                        {forecastSummary.surplus < 0 && (
                          <>
                            <li>Consider increasing your budget by at least {formatCurrency(Math.abs(forecastSummary.surplus))} for the forecast period.</li>
                            <li>Look for ways to reduce spending in non-essential categories.</li>
                          </>
                        )}
                        {forecastSummary.surplus > forecastSummary.totalBudgeted * 0.2 && (
                          <li>Your budget may be significantly higher than needed. Consider reallocating {formatCurrency(forecastSummary.surplus * 0.5)} to other priorities.</li>
                        )}
                        <li>Review your budget allocations monthly to stay on track.</li>
                        <li>Set up budget alerts to be notified when spending approaches limits.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 