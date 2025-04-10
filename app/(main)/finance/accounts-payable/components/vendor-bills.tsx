"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.vendorBill.title': '供应商账单',
  'finance.vendorBill.due': '截止日期',
  'finance.vendorBill.statuses.paid': '已付款',
  'finance.vendorBill.statuses.pending': '待处理',
  'finance.vendorBill.statuses.overdue': '逾期',
  'finance.vendorBill.statuses.draft': '草稿',
  'finance.vendorBill.markPaid': '标记为已付款',
  'finance.vendorBill.fetchError': '获取供应商账单失败。请重试。',
  'finance.vendorBill.statusUpdateSuccess': '账单状态已更新为 {{status}}',
  'finance.vendorBill.statusUpdateError': '更新账单状态失败。请重试。',
  'finance.vendorBill.empty.title': '未找到供应商账单',
  'finance.vendorBill.empty.description': '创建您的第一个供应商账单以开始使用。',
  'finance.vendorBill.createBill': '创建账单',
  'common.retry': '重试',
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
    
    console.log(`Forced vendor bills translation for ${key}: ${translation}`);
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

interface VendorBill {
  id: string;
  billNo: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: string;
}

interface VendorBillsProps {
  columns?: ColumnDef<VendorBill>[];
}

export function VendorBills({ columns }: VendorBillsProps) {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      console.log('Ensuring Chinese translations for Vendor Bills component');
      
      try {
        // Directly add the resources to i18n, even though we have our direct hardcoded approach
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            vendorBill: {
              title: '供应商账单',
              due: '截止日期',
              statuses: {
                paid: '已付款',
                pending: '待处理',
                overdue: '逾期',
                draft: '草稿'
              },
              markPaid: '标记为已付款',
              fetchError: '获取供应商账单失败。请重试。',
              statusUpdateSuccess: '账单状态已更新为 {{status}}',
              statusUpdateError: '更新账单状态失败。请重试。',
              empty: {
                title: '未找到供应商账单',
                description: '创建您的第一个供应商账单以开始使用。'
              },
              createBill: '创建账单'
            }
          }
        });
        console.log('Added vendor bills translations for zh');
        
        // Test a key to see if it worked
        const test = i18nInstance.t('finance.vendorBill.title', { lng: 'zh' });
        console.log('Vendor Bills title test:', test);
      } catch (e) {
        console.error('Error adding vendor bills translations:', e);
      }
    }
  }, [mounted, language, i18nInstance]);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/finance/vendor-bills", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setBills(data);
    } catch (err) {
      console.error("Failed to fetch vendor bills:", err);
      setError(safeT('finance.vendorBill.fetchError', 'Failed to load vendor bills. Please try again.', { t }));
      toast({
        title: safeT('common.error', 'Error'),
        description: safeT('finance.vendorBill.fetchError', 'Failed to load vendor bills. Please try again.', { t }),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    setMounted(true);
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch("/api/finance/vendor-bills", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Update the local state
      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill.id === id ? { ...bill, status } : bill
        )
      );

      toast({
        title: safeT('common.success', 'Success'),
        description: safeT('finance.vendorBill.statusUpdateSuccess', 'Bill status updated to {{status}}', { status: safeT(`finance.vendorBill.statuses.${status}`, status, { t }) }),
      });
    } catch (err) {
      console.error("Failed to update bill status:", err);
      toast({
        title: safeT('common.error', 'Error'),
        description: safeT('finance.vendorBill.statusUpdateError', 'Failed to update bill status. Please try again.'),
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>{safeT('finance.vendorBill.title', 'Vendor Bills')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>{safeT('finance.vendorBill.title', 'Vendor Bills')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchBills}>{safeT('common.retry', 'Retry')}</Button>
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>{safeT('finance.vendorBill.title', 'Vendor Bills')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={safeT('finance.vendorBill.empty.title', 'No vendor bills found')}
            description={safeT('finance.vendorBill.empty.description', 'Create your first vendor bill to get started.')}
            icon="receipt"
            action={{
              label: safeT('finance.vendorBill.createBill', 'Create Bill'),
              href: "/finance/accounts-payable/create-bill",
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{safeT('finance.vendorBill.title', 'Vendor Bills')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg"
            >
              <div className="space-y-1 mb-2 sm:mb-0">
                <div className="font-medium">{bill.billNo}</div>
                <div className="text-sm text-muted-foreground">
                  {bill.vendorName}
                </div>
                <div className="text-sm">
                  {safeT('finance.vendorBill.due', 'Due')}: {new Date(bill.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="font-medium">
                  {formatCurrency(bill.amount)}
                </div>
                <Badge className={getStatusColor(bill.status)}>
                  {safeT(`finance.vendorBill.statuses.${bill.status.toLowerCase()}`, bill.status)}
                </Badge>
                {bill.status !== "paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate(bill.id, "paid")}
                  >
                    {safeT('finance.vendorBill.markPaid', 'Mark Paid')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 