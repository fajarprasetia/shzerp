"use client";

import { useState, useEffect, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { TFunction } from "i18next";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsReceivable.aging.invoiceNo': '发票号码',
  'finance.accountsReceivable.aging.customer': '客户',
  'finance.accountsReceivable.aging.amount': '金额',
  'finance.accountsReceivable.aging.dueDate': '到期日',
  'finance.accountsReceivable.aging.daysOverdue': '逾期 {{days}} 天',
  'finance.accountsReceivable.aging.title': '账龄报告',
  'finance.accountsReceivable.aging.subtitle': '按账龄查看逾期发票',
  'finance.accountsReceivable.aging.current': '当前',
  'finance.accountsReceivable.aging.days30': '1-30天',
  'finance.accountsReceivable.aging.days60': '31-60天',
  'finance.accountsReceivable.aging.days90': '61-90天',
  'finance.accountsReceivable.aging.over90': '90天以上',
  'finance.accountsReceivable.aging.total': '总计',
  'finance.accountsReceivable.aging.noData': '没有可用的账龄数据',
  'finance.accountsReceivable.aging.fetchError': '获取账龄报告失败',
  'finance.accountsReceivable.aging.errorLoading': '加载账龄报告时出错',
  'finance.accountsReceivable.aging.invoiceCount': '{{count}} 张发票',
  'finance.accountsReceivable.aging.bucket.030': '0-30 天',
  'finance.accountsReceivable.aging.bucket.3160': '31-60 天',
  'finance.accountsReceivable.aging.bucket.6190': '61-90 天',
  'finance.accountsReceivable.aging.bucket.90': '90+ 天',
  'finance.accountsReceivable.aging.bucket.Over': '超过 90 天',
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
    
    console.log(`Forced translation for ${key}: ${translation}`);
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

interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  status: "paid" | "unpaid" | "overdue";
}

interface AgingBucket {
  range: string;
  count: number;
  total: number;
  invoices: Invoice[];
}

function getColumns(t: TFunction, language: string): ColumnDef<Invoice>[] {
  // For direct translations
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };

  return [
    {
      accessorKey: "invoiceNo",
      header: safeT('finance.accountsReceivable.aging.invoiceNo', 'Invoice No'),
    },
    {
      accessorKey: "customerName",
      header: safeT('finance.accountsReceivable.aging.customer', 'Customer'),
    },
    {
      accessorKey: "amount",
      header: safeT('finance.accountsReceivable.aging.amount', 'Amount'),
      cell: ({ row }: { row: any }) => {
        const amount = parseFloat(row.getValue("amount"));
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
      },
    },
    {
      accessorKey: "dueDate",
      header: safeT('finance.accountsReceivable.aging.dueDate', 'Due Date'),
      cell: ({ row }: { row: any }) => {
        const date = new Date(row.getValue("dueDate") as string);
        const daysOverdue = differenceInDays(new Date(), date);
        return (
          <div className="flex flex-col">
            <span>{date.toLocaleDateString()}</span>
            <span className="text-sm text-red-500">
              {daysOverdue > 0 ? safeT('finance.accountsReceivable.aging.daysOverdue', '{{days}} days overdue', { days: daysOverdue }) : ""}
            </span>
          </div>
        );
      },
    },
  ];
}

export function AgingReport() {
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Ensure translations exist when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Aging Report component');
      
      try {
        // Directly add the resources to i18n, even though we have our direct hardcoded approach
        i18n.addResources('zh', 'translation', {
          finance: {
            accountsReceivable: {
              aging: {
                invoiceNo: '发票号码',
                customer: '客户',
                amount: '金额',
                dueDate: '到期日',
                daysOverdue: '逾期 {{days}} 天',
                title: '账龄报告',
                subtitle: '按账龄查看逾期发票',
                current: '当前',
                days30: '1-30天',
                days60: '31-60天',
                days90: '61-90天',
                over90: '90天以上',
                total: '总计',
                noData: '没有可用的账龄数据',
                fetchError: '获取账龄报告失败',
                errorLoading: '加载账龄报告时出错',
                invoiceCount: '{{count}} 张发票'
              }
            }
          }
        });
        console.log('Added aging report translations for zh');
        
        // Test a key to see if it worked
        const test = i18n.t('finance.accountsReceivable.aging.title', { lng: 'zh' });
        console.log('Aging title test:', test);
      } catch (e) {
        console.error('Error adding aging translations:', e);
      }
    }
  }, [mounted, language, i18n]);
  
  // Memoize columns with translation function and language
  const columns = useMemo(() => getColumns(t, language), [t, language]);

  useEffect(() => {
    if (!mounted) return;

    const fetchAgingReport = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch pending invoices from the invoice API
        const response = await fetch("/api/sales/invoices?paymentStatus=PENDING");
        
        if (!response.ok) {
          throw new Error("Failed to fetch aging data");
        }
        
        const invoices = await response.json();
        
        // Transform to Invoice objects
        const invoiceData: Invoice[] = invoices.map((invoice: any) => {
          // Calculate due date (30 days from creation if not specified)
          const createdAt = new Date(invoice.createdAt);
          const dueDate = invoice.dueDate 
            ? new Date(invoice.dueDate) 
            : new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          // Calculate if overdue
          const now = new Date();
          const status = now > dueDate ? 'overdue' : 'unpaid';
          
          return {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            amount: invoice.totalAmount,
            dueDate: dueDate,
            status: status
          };
        });
        
        // Group invoices by aging bucket
        const grouped = groupInvoicesByAge(invoiceData);
        setAgingData(grouped);
      } catch (error) {
        console.error("Error fetching aging report:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAgingReport();
  }, [mounted]);

  const bucketColors = {
    "0-30": "bg-green-100",
    "31-60": "bg-yellow-100",
    "61-90": "bg-orange-100",
    "90+": "bg-red-100",
    "Over": "bg-red-100"
  };

  const getBucketColor = (range: string) => {
    const prefix = range.split(" ")[0];
    return bucketColors[prefix as keyof typeof bucketColors] || "bg-gray-100";
  };
  
  // Translation helper function
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{safeT('finance.accountsReceivable.aging.title', 'Aging Report')}</h2>
        <p className="text-muted-foreground">
          {safeT('finance.accountsReceivable.aging.subtitle', 'Track overdue invoices by age ranges')}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive">
          <p className="font-medium">{safeT('finance.accountsReceivable.aging.errorLoading', 'Error loading aging report')}</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90"
          >
            {safeT('common.retry', 'Retry')}
          </button>
        </div>
      )}

      {!loading && !error && agingData.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">{safeT('finance.accountsReceivable.aging.noData', 'No aging data available')}</p>
        </div>
      )}

      {!loading && !error && agingData.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {agingData.map((bucket) => (
              <Card
                key={bucket.range}
                className={`cursor-pointer transition-colors ${
                  getBucketColor(bucket.range)
                } ${selectedBucket === bucket.range ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedBucket(bucket.range)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {safeT(`finance.accountsReceivable.aging.bucket.${bucket.range.replace(/-|\+/g, "")}`, bucket.range)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(bucket.total)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {safeT('finance.accountsReceivable.aging.invoiceCount', '{{count}} invoices', { count: bucket.count })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={
              selectedBucket
                ? agingData.find((b) => b.range === selectedBucket)?.invoices || []
                : agingData.flatMap((b) => b.invoices)
            }
          />
        </>
      )}
    </div>
  );
} 