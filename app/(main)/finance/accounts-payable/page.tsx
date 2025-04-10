"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorBills } from "./components/vendor-bills";
import { PaymentTracking } from "./components/payment-tracking";
import { AgingReport } from "./components/aging-report";
import { useRouter, useSearchParams } from "next/navigation";
import { withPermission } from "@/app/components/with-permission";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { getColumns } from "./components/vendor-bill-columns";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsPayable.title': '应付账款',
  'finance.accountsPayable.description': '管理供应商账单、付款和跟踪账龄账户',
  'finance.accountsPayable.vendorBills': '供应商账单',
  'finance.accountsPayable.paymentTracking': '付款跟踪',
  'finance.accountsPayable.agingReport': '账龄报告',
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
    
    console.log(`Forced AP page translation for ${key}: ${translation}`);
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

export default withPermission(AccountsPayablePage, "finance", "read");

function AccountsPayablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "bills";
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
      console.log('Ensuring Chinese translations for Accounts Payable page');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            accountsPayable: {
              title: '应付账款',
              description: '管理供应商账单、付款和跟踪账龄账户',
              vendorBills: '供应商账单',
              paymentTracking: '付款跟踪',
              agingReport: '账龄报告'
            }
          }
        });
        console.log('Added accounts payable page translations for zh');
        
        // Test a key to see if it worked
        const test = i18nInstance.t('finance.accountsPayable.title', { lng: 'zh' });
        console.log('Accounts Payable title test:', test);
      } catch (e) {
        console.error('Error adding accounts payable translations:', e);
      }
    }
  }, [mounted, language, i18nInstance]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTabChange = (value: string) => {
    router.push(`/finance/accounts-payable?tab=${value}`);
  };

  // Use useMemo to memoize the columns with the translation function and language
  const columns = useMemo(() => getColumns(t, language), [t, language]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-6">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {safeT('finance.accountsPayable.title', 'Accounts Payable')}
        </h1>
        <p className="text-muted-foreground">
          {safeT('finance.accountsPayable.description', 'Manage vendor bills, payments, and track aging accounts')}
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">{safeT('finance.accountsPayable.vendorBills', 'Vendor Bills')}</TabsTrigger>
          <TabsTrigger value="payments">{safeT('finance.accountsPayable.paymentTracking', 'Payment Tracking')}</TabsTrigger>
          <TabsTrigger value="aging">{safeT('finance.accountsPayable.agingReport', 'Aging Report')}</TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="space-y-4">
          <VendorBills />
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <PaymentTracking />
        </TabsContent>
        <TabsContent value="aging" className="space-y-4">
          <AgingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
} 