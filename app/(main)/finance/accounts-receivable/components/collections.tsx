"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { TFunction } from "i18next";
import { useLanguage } from "@/app/providers";

interface CollectionOrder {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  status: "overdue" | "in_collection" | "legal" | "written_off";
  lastContactDate?: Date | null;
  nextFollowUp?: Date | null;
  notes?: string;
}

function getColumns(t: TFunction, language: string): ColumnDef<CollectionOrder>[] {
  // For direct translations
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };

  return [
    {
      accessorKey: "invoiceNo",
      header: safeT('finance.accountsReceivable.collection.orderNo', 'Order No'),
    },
    {
      accessorKey: "customerName",
      header: safeT('finance.accountsReceivable.collection.customer', 'Customer'),
    },
    {
      accessorKey: "amount",
      header: safeT('finance.accountsReceivable.collection.amount', 'Amount'),
      cell: ({ row }) => {
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
      header: safeT('finance.accountsReceivable.collection.dueDate', 'Due Date'),
      cell: ({ row }) => format(new Date(row.getValue("dueDate")), "PPP"),
    },
    {
      accessorKey: "daysOverdue",
      header: safeT('finance.accountsReceivable.collection.daysOverdue', 'Days Overdue'),
      cell: ({ row }) => {
        const days = row.getValue("daysOverdue") as number;
        return (
          <Badge variant="destructive">
            {safeT('finance.accountsReceivable.collection.days', '{{days}} days', { days })}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: safeT('finance.accountsReceivable.collection.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "overdue"
                ? "destructive"
                : status === "in_collection"
                ? "secondary"
                : status === "legal"
                ? "default"
                : "outline"
            }
          >
            {safeT(`finance.accountsReceivable.collection.statuses.${status}`, status.replace("_", " "))}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lastContactDate",
      header: safeT('finance.accountsReceivable.collection.lastContact', 'Last Contact'),
      cell: ({ row }) => {
        const date = row.getValue("lastContactDate");
        return date ? format(new Date(date as string), "PP") : "-";
      },
    },
    {
      accessorKey: "nextFollowUp",
      header: safeT('finance.accountsReceivable.collection.nextFollowup', 'Next Follow-up'),
      cell: ({ row }) => {
        const date = row.getValue("nextFollowUp");
        return date ? format(new Date(date as string), "PP") : "-";
      },
    },
  ];
}

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsReceivable.collection.title': '收款管理',
  'finance.accountsReceivable.collection.subtitle': '管理逾期发票和收款工作',
  'finance.accountsReceivable.collection.orderNo': '订单号',
  'finance.accountsReceivable.collection.customer': '客户',
  'finance.accountsReceivable.collection.amount': '金额',
  'finance.accountsReceivable.collection.dueDate': '到期日',
  'finance.accountsReceivable.collection.daysOverdue': '逾期天数',
  'finance.accountsReceivable.collection.days': '{{days}} 天',
  'finance.accountsReceivable.collection.status': '状态',
  'finance.accountsReceivable.collection.lastContact': '最后联系',
  'finance.accountsReceivable.collection.nextFollowup': '下次跟进',
  'finance.accountsReceivable.collection.errorLoading': '加载收款数据时出错',
  'finance.accountsReceivable.collection.noData': '没有可用的收款数据',
  'finance.accountsReceivable.collection.fetchError': '获取收款数据失败',
  'finance.accountsReceivable.collection.totalOverdue': '逾期总额',
  'finance.accountsReceivable.collection.ordersInCollection': '收款中的订单',
  'finance.accountsReceivable.collection.averageDaysOverdue': '平均逾期天数',
  'finance.accountsReceivable.collection.statuses.overdue': '逾期',
  'finance.accountsReceivable.collection.statuses.in_collection': '收款中',
  'finance.accountsReceivable.collection.statuses.legal': '法律程序',
  'finance.accountsReceivable.collection.statuses.written_off': '已注销',
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
    
    console.log(`Forced collection translation for ${key}: ${translation}`);
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

export function Collections() {
  const [orders, setOrders] = useState<CollectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Collections component');
      
      try {
        // Directly add the resources to i18n, even though we have our direct hardcoded approach
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            accountsReceivable: {
              collection: {
                title: '收款管理',
                subtitle: '管理逾期发票和收款工作',
                orderNo: '订单号',
                customer: '客户',
                amount: '金额',
                dueDate: '到期日',
                daysOverdue: '逾期天数',
                days: '{{days}} 天',
                status: '状态',
                lastContact: '最后联系',
                nextFollowup: '下次跟进',
                errorLoading: '加载收款数据时出错',
                noData: '没有可用的收款数据',
                fetchError: '获取收款数据失败',
                totalOverdue: '逾期总额',
                ordersInCollection: '收款中的订单',
                averageDaysOverdue: '平均逾期天数',
                statuses: {
                  overdue: '逾期',
                  in_collection: '收款中',
                  legal: '法律程序',
                  written_off: '已注销'
                }
              }
            }
          }
        });
        console.log('Added collections translations for zh');
        
        // Test a key to see if it worked
        const test = i18nInstance.t('finance.accountsReceivable.collection.title', { lng: 'zh' });
        console.log('Collections title test:', test);
      } catch (e) {
        console.error('Error adding collection translations:', e);
      }
    }
  }, [mounted, language, i18nInstance]);
  
  // Memoize columns with translation function and language
  const columns = useMemo(() => getColumns(t, language), [t, language]);

  useEffect(() => {
    if (!mounted) return;

    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch overdue invoices from the invoice API
        const response = await fetch("/api/sales/invoices?paymentStatus=PENDING");
        
        if (!response.ok) {
          throw new Error("Failed to fetch collections data");
        }
        
        const invoices = await response.json();
        
        // Transform to Collection order objects
        const collectionData: CollectionOrder[] = invoices.map((invoice: any) => {
          // Calculate the due date (30 days after creation by default)
          const createdAt = new Date(invoice.createdAt);
          const dueDate = invoice.dueDate 
            ? new Date(invoice.dueDate) 
            : new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          // Calculate days overdue
          const now = new Date();
          const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Determine status based on days overdue
          let status: "overdue" | "in_collection" | "legal" | "written_off" = "overdue";
          if (daysOverdue > 90) {
            status = "legal";
          } else if (daysOverdue > 60) {
            status = "in_collection";
          } else if (daysOverdue <= 0) {
            // Not overdue yet, but let's include it in the collections list as upcoming
            status = "overdue";
          }
          
          return {
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            amount: invoice.totalAmount,
            dueDate: dueDate,
            daysOverdue: daysOverdue,
            status: status,
            lastContactDate: null,
            nextFollowUp: null,
            notes: ""
          };
        })
        // Filter to only show invoices that are actually overdue
        .filter((item) => item.daysOverdue > 0);
        
        setOrders(collectionData);
      } catch (error) {
        console.error("Error fetching collections:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [mounted]);

  const totalOverdue = orders.reduce((sum, order) => sum + order.amount, 0);
  const averageDaysOverdue = Math.round(
    orders.reduce((sum, order) => sum + order.daysOverdue, 0) / orders.length || 0
  );
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{safeT('finance.accountsReceivable.collection.title', 'Collections')}</h2>
        <p className="text-muted-foreground">
          {safeT('finance.accountsReceivable.collection.subtitle', 'Manage overdue invoices and collection efforts')}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive">
          <p className="font-medium">{safeT('finance.accountsReceivable.collection.errorLoading', 'Error loading collections data')}</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90"
          >
            {safeT('common.retry', 'Retry')}
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">{safeT('finance.accountsReceivable.collection.noData', 'No collections data available')}</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {safeT('finance.accountsReceivable.collection.totalOverdue', 'Total Overdue')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(totalOverdue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {safeT('finance.accountsReceivable.collection.ordersInCollection', 'Orders in Collection')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orders.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {safeT('finance.accountsReceivable.collection.averageDaysOverdue', 'Average Days Overdue')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeT('finance.accountsReceivable.collection.days', '{{days}} days', { days: averageDaysOverdue })}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={orders}
          />
        </>
      )}
    </div>
  );
} 