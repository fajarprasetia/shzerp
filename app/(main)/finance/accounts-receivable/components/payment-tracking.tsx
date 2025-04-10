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
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

interface Payment {
  id: string;
  invoiceNo: string;
  customer: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  paymentImage?: string;
}

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsReceivable.paymentTracking.title': '付款跟踪',
  'finance.accountsReceivable.paymentTracking.subtitle': '跟踪和管理客户付款',
  'finance.accountsReceivable.paymentTracking.invoiceNo': '发票号码',
  'finance.accountsReceivable.paymentTracking.customer': '客户',
  'finance.accountsReceivable.paymentTracking.amount': '金额',
  'finance.accountsReceivable.paymentTracking.paymentDate': '付款日期',
  'finance.accountsReceivable.paymentTracking.paymentMethod': '付款方式',
  'finance.accountsReceivable.paymentTracking.reference': '参考编号',
  'finance.accountsReceivable.paymentTracking.totalPayments': '付款总额',
  'finance.accountsReceivable.paymentTracking.noData': '没有可用的付款数据',
  'finance.accountsReceivable.paymentTracking.fetchError': '获取付款数据失败',
  'finance.accountsReceivable.paymentTracking.errorLoading': '加载付款数据时出错',
  'sales.invoices.paymentProof': '付款凭证',
  'sales.invoices.paymentProofDesc': '查看上传的付款凭证图片',
  'common.retry': '重试',
  'common.view': '查看'
};

// Global translation function that completely bypasses i18n for Chinese
const forcedTranslate = (key: string, defaultValue: string, language: string): string => {
  // For Chinese, use our hardcoded map
  if (language === 'zh' && key in ZH_TRANSLATIONS) {
    console.log(`Forced translation for ${key}: ${ZH_TRANSLATIONS[key]}`);
    return ZH_TRANSLATIONS[key];
  }
  
  // Fallback to default value
  return defaultValue;
};

// This function creates columns with translations
function createColumns(t: TFunction, onViewImage: (url: string) => void, language: string): ColumnDef<Payment>[] {
  try {
    // Log what we're doing
    console.log('Creating columns with FORCED translations for language:', language);
    
    // Use our direct translation function
    const getHeader = (key: string, defaultValue: string): string => {
      return forcedTranslate(key, defaultValue, language);
    };
    
    // Create columns with our forced translations
    return [
      {
        accessorKey: "invoiceNo",
        header: getHeader("finance.accountsReceivable.paymentTracking.invoiceNo", "Invoice No"),
      },
      {
        accessorKey: "customer",
        header: getHeader("finance.accountsReceivable.paymentTracking.customer", "Customer"),
      },
      {
        accessorKey: "amount",
        header: getHeader("finance.accountsReceivable.paymentTracking.amount", "Amount"),
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount"));
          return formatCurrency(amount);
        },
      },
      {
        accessorKey: "paymentDate",
        header: getHeader("finance.accountsReceivable.paymentTracking.paymentDate", "Payment Date"),
        cell: ({ row }) => {
          const date = new Date(row.getValue("paymentDate"));
          return format(date, "PPP");
        },
      },
      {
        accessorKey: "paymentMethod",
        header: getHeader("finance.accountsReceivable.paymentTracking.paymentMethod", "Payment Method"),
      },
      {
        accessorKey: "reference",
        header: getHeader("finance.accountsReceivable.paymentTracking.reference", "Reference"),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const payment = row.original;
          if (payment.paymentImage) {
            return (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onViewImage(getPaymentImageUrl(payment))}
              >
                <Eye className="h-4 w-4 mr-2" />
                {forcedTranslate('common.view', 'View', language)}
              </Button>
            );
          }
          return null;
        },
      },
    ];
  } catch (error) {
    console.error('Error creating columns:', error);
    
    // Return default columns in case of error
    return [
      { accessorKey: "invoiceNo", header: "Invoice No" },
      { accessorKey: "customer", header: "Customer" },
      { 
        accessorKey: "amount", 
        header: "Amount",
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("amount"));
          return formatCurrency(amount);
        }
      },
      { 
        accessorKey: "paymentDate", 
        header: "Payment Date",
        cell: ({ row }) => {
          const date = new Date(row.getValue("paymentDate"));
          return format(date, "PPP");
        }
      },
      { accessorKey: "paymentMethod", header: "Payment Method" },
      { accessorKey: "reference", header: "Reference" },
      {
        id: "actions",
        cell: ({ row }) => {
          const payment = row.original;
          if (payment.paymentImage) {
            return (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onViewImage(getPaymentImageUrl(payment))}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            );
          }
          return null;
        },
      },
    ];
  }
}

// Helper function to get payment image URL
const getPaymentImageUrl = (payment: Payment): string => {
  if (!payment.paymentImage) return '';

  // Check if it's already a full URL
  if (payment.paymentImage.startsWith('http')) {
    return payment.paymentImage;
  }

  // Construct the URL based on how your backend serves images
  return `/uploads/payments/${payment.paymentImage}`;
};

const PaymentTracking: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  const [forceUpdate, setForceUpdate] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Handle viewing payment image
  const handleViewImage = (url: string) => {
    setSelectedImage(url);
  };

  // Force columns to update when language changes
  const columns = useMemo(() => {
    console.log(`Payment Tracking: Creating columns with language ${language} (force update: ${forceUpdate})`);
    return createColumns(t, handleViewImage, language);
  }, [t, language, forceUpdate, handleViewImage]);

  // Effect for language change
  useEffect(() => {
    // When language changes, force column recreation
    console.log(`Language changed to: ${language}, i18n language: ${i18n.language}`);
    
    // Ensure translations are loaded when language changes
    if (mounted) {
      ensureTranslationsLoaded();
      setForceUpdate(prev => prev + 1);
    }
  }, [language, i18n.language, mounted]);

  // Function to ensure translations are available
  const ensureTranslationsLoaded = () => {
    if (i18n.language === 'zh') {
      console.log('Ensuring Chinese translations are available for PaymentTracking');
      
      // Check if translations exist
      const keyExists = (key: string) => {
        const exists = i18n.exists(`finance.accountsReceivable.paymentTracking.${key}`, { lng: 'zh' });
        const value = i18n.t(`finance.accountsReceivable.paymentTracking.${key}`, { lng: 'zh' });
        console.log(`Key ${key}: exists=${exists}, value="${value}"`);
        return { exists, value };
      };
      
      // Check all required keys
      const keyChecks = {
        title: keyExists('title'),
        subtitle: keyExists('subtitle'),
        invoiceNo: keyExists('invoiceNo'),
        customer: keyExists('customer'),
        amount: keyExists('amount'),
        paymentDate: keyExists('paymentDate'),
        paymentMethod: keyExists('paymentMethod'),
        reference: keyExists('reference'),
        totalPayments: keyExists('totalPayments'),
        noData: keyExists('noData'),
        fetchError: keyExists('fetchError'),
        errorLoading: keyExists('errorLoading')
      };
      
      // If any keys are missing, force add them
      const missingKeys = Object.entries(keyChecks)
        .filter(([_, info]) => !info.exists || info.value.includes('translation missing'))
        .map(([key]) => key);
      
      if (missingKeys.length > 0) {
        console.log('Found missing keys that need to be forced:', missingKeys);
        
        // Manual translation map for missing keys
        const manualTranslations: Record<string, string> = {
          title: '付款跟踪',
          subtitle: '跟踪和管理客户付款',
          invoiceNo: '发票号码',
          customer: '客户',
          amount: '金额',
          paymentDate: '付款日期',
          paymentMethod: '付款方式',
          reference: '参考编号',
          totalPayments: '付款总额',
          noData: '没有可用的付款数据',
          fetchError: '获取付款数据失败',
          errorLoading: '加载付款数据时出错'
        };
        
        // Build a specific object with just the missing keys
        const translationsToAdd: Record<string, string> = {};
        missingKeys.forEach(key => {
          translationsToAdd[key] = manualTranslations[key];
        });
        
        // Add the translations directly
        try {
          // Add at the parent namespace
          i18n.addResources('zh', 'translation', {
            finance: {
              accountsReceivable: {
                paymentTracking: translationsToAdd
              }
            }
          });
          console.log('Added missing translations directly');
          
          // Test the keys again
          missingKeys.forEach(key => {
            const value = i18n.t(`finance.accountsReceivable.paymentTracking.${key}`, { lng: 'zh' });
            console.log(`After adding, key ${key} value: "${value}"`);
          });
          
          // Force columns to update
          setForceUpdate(prev => prev + 1);
        } catch (error) {
          console.error('Error adding translations manually:', error);
        }
      } else {
        console.log('All payment tracking translation keys are available');
      }
    }
  };

  // Effect for component mounting
  useEffect(() => {
    setMounted(true);

    // Debug language state
    console.log("Payment Tracking: Language state:", {
      contextLanguage: language,
      i18nLanguage: i18n.language,
      ready: i18n.isInitialized
    });

    // Ensure translations are loaded
    ensureTranslationsLoaded();

    // Force reload finance translations if we're in Chinese
    if (i18n.language === 'zh') {
      try {
        // Directly add the resources to ensure they're available
        i18n.addResources('zh', 'translation', {
          finance: {
            accountsReceivable: {
              paymentTracking: {
                title: '付款跟踪',
                subtitle: '跟踪和管理客户付款',
                invoiceNo: '发票号码',
                customer: '客户',
                amount: '金额',
                paymentDate: '付款日期',
                paymentMethod: '付款方式',
                reference: '参考编号',
                totalPayments: '付款总额',
                noData: '没有可用的付款数据',
                fetchError: '获取付款数据失败',
                errorLoading: '加载付款数据时出错'
              }
            }
          }
        });
        console.log('Forced Chinese finance translations to be reloaded in component');
        
        // Verify that the translations are available
        const testTitle = i18n.t('finance.accountsReceivable.paymentTracking.title', { lng: 'zh' });
        console.log('Verified Chinese translation is loaded:', testTitle);
      } catch (error) {
        console.error('Error forcing translations:', error);
      }
    }

    // Test translation directly
    try {
      // Test with explicit language
      const test1 = i18nInstance.t('finance.accountsReceivable.paymentTracking.title');
      const test2 = i18nInstance.t('finance.accountsReceivable.paymentTracking.title', { lng: 'zh' });
      console.log("Direct translation tests:", {
        defaultLang: test1,
        chineseLang: test2
      });
    } catch (error) {
      console.error("PaymentTracking direct translation error:", error);
    }

    return () => {
      console.log("PaymentTracking component unmounting");
    };
  }, [language, i18n, t]);

  // Effect for data fetching
  useEffect(() => {
    if (!mounted) return;

    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch paid invoices from the invoices API
        const response = await fetch("/api/sales/invoices?paymentStatus=PAID");
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const invoices = await response.json();
        
        // Transform invoices to payment objects
        const paymentData: Payment[] = invoices.map((invoice: any) => ({
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          customer: invoice.customerName,
          amount: invoice.totalAmount || 0,
          paymentDate: invoice.paymentDate || invoice.updatedAt,
          paymentMethod: invoice.paymentMethod || 'Bank Transfer', // Default if not available
          reference: invoice.reference || invoice.id.substring(0, 8),
          paymentImage: invoice.paymentImage
        }));
        
        setPayments(paymentData);
      } catch (error) {
        console.error("Error fetching payments:", error);
        setError(error instanceof Error ? error.message : t('common.genericError', 'An unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [mounted, t]);

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{t('common.loading', 'Loading...')}</div>;
  }

  // Define titles using our forced translations
  const title = forcedTranslate("finance.accountsReceivable.paymentTracking.title", "Payment Tracking", language);
  const subtitle = forcedTranslate("finance.accountsReceivable.paymentTracking.subtitle", "Track and manage customer payments", language);
  const errorLoadingText = forcedTranslate('finance.accountsReceivable.paymentTracking.errorLoading', 'Error loading payment data', language);
  const noDataText = forcedTranslate('finance.accountsReceivable.paymentTracking.noData', 'No payment data available', language);
  const totalPaymentsText = forcedTranslate("finance.accountsReceivable.paymentTracking.totalPayments", "Total Payments", language);
  const retryText = forcedTranslate('common.retry', 'Retry', language);

  return (
    <>
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

          {!loading && !error && payments.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">{noDataText}</p>
            </div>
          )}

          {!loading && !error && payments.length > 0 && (
            <>
              <div className="mb-4">
                <div className="text-sm font-medium">{totalPaymentsText}: {formatCurrency(totalPayments)}</div>
              </div>
              <DataTable
                columns={columns}
                data={payments}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{forcedTranslate('sales.invoices.paymentProof', 'Payment Proof', language)}</DialogTitle>
            <DialogDescription>
              {forcedTranslate('sales.invoices.paymentProofDesc', 'View uploaded payment proof image', language)}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full h-auto max-h-[60vh] overflow-auto">
              <Image
                src={selectedImage}
                alt="Payment Proof"
                width={800}
                height={800}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentTracking; 