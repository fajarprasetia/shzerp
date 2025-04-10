"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetList } from "./components/budget-list";
import { BudgetForm } from "./components/budget-form";
import { BudgetForecast } from "./components/budget-forecast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBudgets } from "../hooks/use-budgets";
import { useTransactions } from "../hooks/use-transactions";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Budget, Transaction } from "@/types/finance";
import { useState, useEffect } from "react";
import { withPermission } from "@/app/components/with-permission";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.budgets.title': '预算管理',
  'finance.budgets.subtitle': '管理预算、预测和跟踪支出',
  'finance.budgets.forecast': '预算预测',
  'finance.budgets.budget': '预算',
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
    
    console.log(`Forced budgets translation for ${key}: ${translation}`);
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

export default withPermission(BudgetsPage, "finance", "read");

function BudgetsPage() {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  const [isAddingBudget, setIsAddingBudget] = React.useState(false);
  const { budgets, isLoading: isLoadingBudgets, isError: isErrorBudgets, mutate } = useBudgets();
  const { transactions, isLoading: isLoadingTransactions, isError: isErrorTransactions } = useTransactions();
  const [selectedBudget, setSelectedBudget] = React.useState<Budget | null>(null);
  const [activeTab, setActiveTab] = React.useState("overview");
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Budgets');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            budgets: {
              title: '预算管理',
              subtitle: '管理预算、预测和跟踪支出',
              forecast: '预算预测',
              budget: '预算'
            }
          }
        });
        console.log('Added budgets translations for zh');
      } catch (e) {
        console.error('Error adding budgets translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);
  
  const handleSuccess = () => {
    setIsAddingBudget(false);
    setSelectedBudget(null);
    mutate();
  };

  // Calculate category spending from transactions
  const categorySpending = React.useMemo(() => {
    if (!Array.isArray(transactions)) return {};
    
    return transactions.reduce((acc: Record<string, number>, transaction: Transaction) => {
      if (transaction.type === 'expense') {
        const category = transaction.category;
        acc[category] = (acc[category] || 0) + transaction.amount;
      }
      return acc;
    }, {});
  }, [transactions]);

  // Calculate totals with safe defaults
  const totalBudget = React.useMemo(() => 
    Array.isArray(budgets) ? budgets.reduce((sum, budget) => sum + (budget.amount || 0), 0) : 0
  , [budgets]);

  const totalSpent = React.useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const isLoading = isLoadingBudgets || isLoadingTransactions;
  const isError = isErrorBudgets || isErrorTransactions;

  // Enhance budgets with spending data
  const budgetsWithSpending = React.useMemo(() => {
    if (!Array.isArray(budgets)) return [];
    
    return budgets.map(budget => ({
      ...budget,
      spent: categorySpending[budget.category] || 0
    }));
  }, [budgets, categorySpending]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border border-destructive p-4">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p className="text-muted-foreground">Failed to load budgets. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-[140px]" />
                <Skeleton className="h-4 w-[180px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{safeT('finance.budgets.title', 'Budget Management')}</h1>
        <p className="text-muted-foreground">
          {safeT('finance.budgets.subtitle', 'Manage budgets, forecasts, and track spending')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">{safeT('finance.budgets.forecast', 'Budget Forecast')}</TabsTrigger>
          <TabsTrigger value="budget">{safeT('finance.budgets.budget', 'Budget')}</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          <BudgetForecast 
            budgets={budgetsWithSpending}
            transactions={Array.isArray(transactions) ? transactions : []}
          />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetForm
            budget={selectedBudget}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAddingBudget(false);
              setSelectedBudget(null);
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={isAddingBudget || !!selectedBudget}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingBudget(false);
            setSelectedBudget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedBudget ? "Edit Budget" : "Add Budget"}
            </DialogTitle>
          </DialogHeader>
          <BudgetForm
            budget={selectedBudget}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAddingBudget(false);
              setSelectedBudget(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 