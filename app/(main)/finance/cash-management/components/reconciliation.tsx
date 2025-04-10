"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns, getColumns } from "./reconciliation-columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReconciliationForm } from "./reconciliation-form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.reconciliation.title': '对账',
  'finance.reconciliation.totalDifference': '总差额',
  'finance.reconciliation.pendingReconciliations': '待处理对账',
  'finance.reconciliation.newReconciliation': '新建对账',
  'finance.reconciliation.createReconciliation': '创建对账',
  'finance.reconciliation.errorLoading': '加载对账时出错',
  'finance.reconciliation.errorDescription': '加载对账时遇到问题。',
  'finance.reconciliation.serverError': '服务器错误',
  'finance.reconciliation.serverErrorDescription': '服务器遇到错误。这可能是因为数据库表尚未设置。',
  'finance.reconciliation.tryAgain': '重试',
  'finance.reconciliation.noReconciliations': '未找到对账',
  'finance.reconciliation.noReconciliationsDescription': '您尚未创建任何银行对账。',
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
    
    console.log(`Forced reconciliation translation for ${key}: ${translation}`);
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

interface Reconciliation {
  id: string;
  date: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: "pending" | "completed";
  notes?: string;
}

export function Reconciliation() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
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
      console.log('Ensuring Chinese translations for Reconciliation component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            reconciliation: {
              title: '对账',
              totalDifference: '总差额',
              pendingReconciliations: '待处理对账',
              newReconciliation: '新建对账',
              createReconciliation: '创建对账',
              errorLoading: '加载对账时出错',
              errorDescription: '加载对账时遇到问题。',
              serverError: '服务器错误',
              serverErrorDescription: '服务器遇到错误。这可能是因为数据库表尚未设置。',
              tryAgain: '重试',
              noReconciliations: '未找到对账',
              noReconciliationsDescription: '您尚未创建任何银行对账。'
            }
          }
        });
        console.log('Added reconciliation translations for zh');
      } catch (e) {
        console.error('Error adding reconciliation translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const fetchReconciliations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/finance/reconciliations", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        if (response.status === 500) {
          console.error("Server error when fetching reconciliations");
          setReconciliations([]);
          toast({
            title: safeT("finance.reconciliation.serverError", "Server Error"),
            description: safeT("finance.reconciliation.serverErrorDescription", "The server encountered an error. This might be because the database tables are not yet set up."),
            variant: "destructive",
          });
          return;
        }
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setReconciliations(data);
    } catch (error) {
      console.error("Error fetching reconciliations:", error);
      setError(safeT("finance.reconciliation.errorLoading", "Failed to load reconciliations"));
      toast({
        title: safeT("common.error", "Error"),
        description: safeT("finance.reconciliation.errorDescription", "Failed to load reconciliations. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, language]);

  useEffect(() => {
    fetchReconciliations();
  }, [fetchReconciliations]);

  const totalDifference = reconciliations?.length 
    ? reconciliations.reduce((sum, r) => sum + r.difference, 0)
    : 0;
    
  const pendingCount = reconciliations?.length 
    ? reconciliations.filter(r => r.status === "pending").length
    : 0;

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
          title={safeT("finance.reconciliation.errorLoading", "Error loading reconciliations")}
          description={safeT("finance.reconciliation.errorDescription", "We encountered a problem while loading your bank reconciliations.")}
          icon="alertTriangle"
          action={{
            label: safeT("finance.reconciliation.tryAgain", "Try Again"),
            onClick: fetchReconciliations,
          }}
        />
      </div>
    );
  }

  if (!reconciliations?.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={safeT("finance.reconciliation.noReconciliations", "No reconciliations found")}
          description={safeT("finance.reconciliation.noReconciliationsDescription", "You haven't created any bank reconciliations yet.")}
          icon="fileCheck"
          action={{
            label: safeT("finance.reconciliation.createReconciliation", "Create Reconciliation"),
            onClick: () => setFormOpen(true),
          }}
        />
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>{safeT("finance.reconciliation.createReconciliation", "Create Bank Reconciliation")}</DialogTitle>
            <ReconciliationForm 
              onSuccess={() => {
                setFormOpen(false);
                fetchReconciliations();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.reconciliation.totalDifference", "Total Difference")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totalDifference)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.reconciliation.pendingReconciliations", "Pending Reconciliations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">{safeT("finance.reconciliation.title", "Bank Reconciliation")}</h2>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              {safeT("finance.reconciliation.newReconciliation", "New Reconciliation")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{safeT("finance.reconciliation.createReconciliation", "Create Bank Reconciliation")}</DialogTitle>
            <ReconciliationForm onSuccess={() => {
              setFormOpen(false);
              fetchReconciliations();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={enhancedColumns}
        data={reconciliations}
        loading={loading}
      />
    </div>
  );
} 