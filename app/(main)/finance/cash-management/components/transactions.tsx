"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns, getColumns } from "./transaction-columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionForm } from "./transaction-form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.transactions.title': '交易',
  'finance.transactions.totalIncome': '总收入',
  'finance.transactions.totalExpenses': '总支出',
  'finance.transactions.netFlow': '净流量',
  'finance.transactions.addTransaction': '添加交易',
  'finance.transactions.newTransaction': '新交易',
  'finance.transactions.errorLoading': '加载交易时出错',
  'finance.transactions.errorDescription': '加载交易时遇到问题。',
  'finance.transactions.tryAgain': '重试',
  'finance.transactions.noTransactions': '未找到交易',
  'finance.transactions.noTransactionsDescription': '您尚未记录任何交易。添加您的第一笔交易以开始使用。',
  'common.error': '错误',
  'common.success': '成功',
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
    
    console.log(`Forced transactions translation for ${key}: ${translation}`);
    return translation;
  }
  
  // Check if we have translations in the window object (from layout)
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

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Transactions component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            transactions: {
              title: '交易',
              totalIncome: '总收入',
              totalExpenses: '总支出',
              netFlow: '净流量',
              addTransaction: '添加交易',
              newTransaction: '新交易',
              errorLoading: '加载交易时出错',
              errorDescription: '加载交易时遇到问题。',
              tryAgain: '重试',
              noTransactions: '未找到交易',
              noTransactionsDescription: '您尚未记录任何交易。添加您的第一笔交易以开始使用。'
            }
          }
        });
        console.log('Added transactions translations for zh');
      } catch (e) {
        console.error('Error adding transactions translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/finance/transactions", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError(safeT("finance.transactions.errorLoading", "Failed to load transactions"));
      toast({
        title: safeT("common.error", "Error"),
        description: safeT("finance.transactions.errorDescription", "Failed to load transactions. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, language]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalIncome = transactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  // Format currency with Rp. prefix for IDR
  const formatRupiah = (amount: number) => {
    return `Rp. ${amount.toLocaleString('id-ID')}`;
  };

  // Get the translated columns
  const enhancedColumns = useMemo(() => getColumns(t, language), [t, language]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={safeT("finance.transactions.errorLoading", "Error loading transactions")}
          description={safeT("finance.transactions.errorDescription", "We encountered a problem while loading your transactions.")}
          icon="alertTriangle"
          action={{
            label: safeT("finance.transactions.tryAgain", "Try Again"),
            onClick: fetchTransactions,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.transactions.totalIncome", "Total Income")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.transactions.totalExpenses", "Total Expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatRupiah(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.transactions.netFlow", "Net Flow")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatRupiah(totalIncome - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">{safeT("finance.transactions.title", "Transactions")}</h2>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              {safeT("finance.transactions.addTransaction", "Add Transaction")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{safeT("finance.transactions.newTransaction", "Add New Transaction")}</DialogTitle>
            <TransactionForm onSuccess={() => {
              setFormOpen(false);
              fetchTransactions();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title={safeT("finance.transactions.noTransactions", "No transactions found")}
          description={safeT("finance.transactions.noTransactionsDescription", "You haven't recorded any transactions yet. Add your first transaction to get started.")}
          icon="receipt"
          action={{
            label: safeT("finance.transactions.addTransaction", "Add Transaction"),
            onClick: () => setFormOpen(true),
          }}
        />
      ) : (
        <DataTable
          columns={enhancedColumns}
          data={transactions}
          loading={loading}
        />
      )}
    </div>
  );
} 