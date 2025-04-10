"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { TFunction } from "i18next";
import { useLanguage } from "@/app/providers";

interface Reconciliation {
  id: string;
  invoiceNo: string;
  customer: string;
  invoiceAmount: number;
  paymentsReceived: number;
  balance: number;
  dueDate: string;
  lastPaymentDate: string;
}

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsReceivable.reconciliationDetails.title': '应收账款对账',
  'finance.accountsReceivable.reconciliationDetails.subtitle': '核对应收账款余额',
  'finance.accountsReceivable.reconciliationDetails.invoiceNo': '发票号码',
  'finance.accountsReceivable.reconciliationDetails.customer': '客户',
  'finance.accountsReceivable.reconciliationDetails.invoiceAmount': '发票金额',
  'finance.accountsReceivable.reconciliationDetails.paymentsReceived': '已收款项',
  'finance.accountsReceivable.reconciliationDetails.balance': '余额',
  'finance.accountsReceivable.reconciliationDetails.dueDate': '到期日',
  'finance.accountsReceivable.reconciliationDetails.lastPaymentDate': '最后付款日期',
  'finance.accountsReceivable.reconciliationDetails.totalInvoiceAmount': '发票总额',
  'finance.accountsReceivable.reconciliationDetails.totalPaymentsReceived': '已收款项总额',
  'finance.accountsReceivable.reconciliationDetails.totalBalance': '余额总计',
  'finance.accountsReceivable.reconciliationDetails.errorLoading': '加载对账数据时出错',
  'finance.accountsReceivable.reconciliationDetails.noData': '没有可用的对账数据',
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

// This function creates columns with translations and fallbacks
function createColumns(t: TFunction, language: string): ColumnDef<Reconciliation>[] {
  // For direct translations
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };

  return [
    {
      accessorKey: "invoiceNo",
      header: safeT("finance.accountsReceivable.reconciliationDetails.invoiceNo", "Invoice No"),
    },
    {
      accessorKey: "customer",
      header: safeT("finance.accountsReceivable.reconciliationDetails.customer", "Customer"),
    },
    {
      accessorKey: "invoiceAmount",
      header: safeT("finance.accountsReceivable.reconciliationDetails.invoiceAmount", "Invoice Amount"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("invoiceAmount"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
        return formatted;
      },
    },
    {
      accessorKey: "paymentsReceived",
      header: safeT("finance.accountsReceivable.reconciliationDetails.paymentsReceived", "Payments Received"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("paymentsReceived"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
        return formatted;
      },
    },
    {
      accessorKey: "balance",
      header: safeT("finance.accountsReceivable.reconciliationDetails.balance", "Balance"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("balance"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
        return formatted;
      },
    },
    {
      accessorKey: "dueDate",
      header: safeT("finance.accountsReceivable.reconciliationDetails.dueDate", "Due Date"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("dueDate"));
        return date.toLocaleDateString();
      },
    },
    {
      accessorKey: "lastPaymentDate",
      header: safeT("finance.accountsReceivable.reconciliationDetails.lastPaymentDate", "Last Payment Date"),
      cell: ({ row }) => {
        const date = row.getValue("lastPaymentDate") ? new Date(row.getValue("lastPaymentDate")) : null;
        return date ? date.toLocaleDateString() : "-";
      },
    },
  ];
}

export const ARReconciliation: React.FC = () => {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for AR Reconciliation component');
      
      try {
        // Directly add the resources to i18n, even though we have our direct hardcoded approach
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            accountsReceivable: {
              reconciliationDetails: {
                title: '应收账款对账',
                subtitle: '核对应收账款余额',
                invoiceNo: '发票号码',
                customer: '客户',
                invoiceAmount: '发票金额',
                paymentsReceived: '已收款项',
                balance: '余额',
                dueDate: '到期日',
                lastPaymentDate: '最后付款日期',
                totalInvoiceAmount: '发票总额',
                totalPaymentsReceived: '已收款项总额',
                totalBalance: '余额总计',
                errorLoading: '加载对账数据时出错',
                noData: '没有可用的对账数据'
              }
            }
          }
        });
        console.log('Added AR Reconciliation translations for zh');
        
        // Test a key to see if it worked
        const test = i18nInstance.t('finance.accountsReceivable.reconciliationDetails.title', { lng: 'zh' });
        console.log('AR Reconciliation title test:', test);
      } catch (e) {
        console.error('Error adding AR Reconciliation translations:', e);
      }
    }
  }, [mounted, language, i18nInstance]);

  // Force columns to update when language changes
  const columns = useMemo(() => {
    console.log(`AR Reconciliation: Creating columns with language ${language} (force update: ${forceUpdate})`);
    return createColumns(t, language);
  }, [t, language, forceUpdate]);

  // Effect for language change
  useEffect(() => {
    // When language changes, force column recreation
    console.log(`AR Reconciliation: Language changed to: ${language}, i18n language: ${i18n.language}`);
    
    // Force rerender when language changes
    if (mounted) {
      setForceUpdate(prev => prev + 1);
    }
  }, [language, i18n.language, mounted]);

  // Effect for component mounting
  useEffect(() => {
    setMounted(true);
    
    // Debug language state
    console.log("AR Reconciliation: Language state:", {
      contextLanguage: language,
      i18nLanguage: i18n.language,
      ready: i18n.isInitialized
    });

    return () => {
      console.log("AR Reconciliation component unmounting");
    };
  }, [language, i18n, t]);

  // Effect for data fetching
  useEffect(() => {
    if (!mounted) return;

    const fetchReconciliations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch accounts receivable data from API
        const arResponse = await fetch("/api/finance/accounts-receivable");
        
        if (!arResponse.ok) {
          throw new Error("Failed to fetch reconciliation data");
        }
        
        const arData = await arResponse.json();
        
        // Also fetch all invoices for these accounts
        const invoiceResponse = await fetch("/api/sales/invoices");
        const invoices = await invoiceResponse.json();
        
        // Group invoices by customer
        const invoicesByCustomer = invoices.reduce((acc: Record<string, any[]>, invoice: any) => {
          if (!acc[invoice.customerId]) {
            acc[invoice.customerId] = [];
          }
          acc[invoice.customerId].push(invoice);
          return acc;
        }, {});
        
        // Transform to reconciliation data
        const reconciliationData: Reconciliation[] = [];
        
        // Process each accounts receivable record
        arData.forEach((ar: any) => {
          const customerInvoices = invoicesByCustomer[ar.customerId] || [];
          
          // Process each invoice for this customer
          customerInvoices.forEach((invoice: any) => {
            reconciliationData.push({
              id: invoice.id,
              invoiceNo: invoice.invoiceNo,
              customer: invoice.customerName,
              invoiceAmount: invoice.totalAmount,
              paymentsReceived: invoice.paymentStatus === "PAID" ? invoice.totalAmount : 0,
              balance: invoice.paymentStatus === "PAID" ? 0 : invoice.totalAmount,
              dueDate: invoice.dueDate || new Date(new Date(invoice.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              lastPaymentDate: invoice.paymentDate || null
            });
          });
        });
        
        setReconciliations(reconciliationData);
      } catch (error) {
        console.error("Error fetching reconciliations:", error);
        setError(error instanceof Error ? error.message : safeT('common.genericError', 'An unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchReconciliations();
  }, [mounted, safeT]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  // Calculate totals with safety checks
  const totalInvoiceAmount = reconciliations.reduce((sum, rec) => sum + (rec.invoiceAmount || 0), 0);
  const totalPaymentsReceived = reconciliations.reduce((sum, rec) => sum + (rec.paymentsReceived || 0), 0);
  const totalBalance = reconciliations.reduce((sum, rec) => sum + (rec.balance || 0), 0);
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Define titles with safeT for fallbacks
  const title = safeT("finance.accountsReceivable.reconciliationDetails.title", "AR Reconciliation");
  const subtitle = safeT("finance.accountsReceivable.reconciliationDetails.subtitle", "Reconcile accounts receivable balances");
  const errorLoadingText = safeT("finance.accountsReceivable.reconciliationDetails.errorLoading", "Error loading reconciliation data");
  const noDataText = safeT("finance.accountsReceivable.reconciliationDetails.noData", "No reconciliation data available");
  const invoiceAmountText = safeT("finance.accountsReceivable.reconciliationDetails.totalInvoiceAmount", "Total Invoice Amount");
  const paymentsReceivedText = safeT("finance.accountsReceivable.reconciliationDetails.totalPaymentsReceived", "Total Payments Received");
  const balanceText = safeT("finance.accountsReceivable.reconciliationDetails.totalBalance", "Total Balance");
  const retryText = safeT("common.retry", "Retry");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-destructive/15 p-4 rounded-md text-destructive">
            <p className="font-medium">{errorLoadingText}</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90"
            >
              {retryText}
            </button>
          </div>
        )}

        {!loading && !error && reconciliations.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">{noDataText}</p>
          </div>
        )}

        {!loading && !error && reconciliations.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">{invoiceAmountText}</div>
                <div className="text-lg font-medium">{formatCurrency(totalInvoiceAmount)}</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">{paymentsReceivedText}</div>
                <div className="text-lg font-medium">{formatCurrency(totalPaymentsReceived)}</div>
              </div>
              <div className="p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">{balanceText}</div>
                <div className="text-lg font-medium">{formatCurrency(totalBalance)}</div>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={reconciliations}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}; 