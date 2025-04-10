"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankAccounts } from "./components/bank-accounts";
import { Transactions } from "./components/transactions";
import { Reconciliation } from "./components/reconciliation";
import { useSearchParams, useRouter } from "next/navigation";
import { withPermission } from "@/app/components/with-permission";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.cashManagement.title': '现金管理',
  'finance.cashManagement.subtitle': '管理银行账户、交易和对账',
  'finance.cashManagement.bankAccounts': '银行账户',
  'finance.cashManagement.transactions': '交易',
  'finance.cashManagement.reconciliation': '对账',
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
    
    console.log(`Forced cash management translation for ${key}: ${translation}`);
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

export default withPermission(CashManagementPage, "finance", "read");

function CashManagementPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState("accounts");
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
      console.log('Ensuring Chinese translations for Cash Management page');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            cashManagement: {
              title: '现金管理',
              subtitle: '管理银行账户、交易和对账',
              bankAccounts: '银行账户',
              transactions: '交易',
              reconciliation: '对账'
            }
          }
        });
        console.log('Added cash management page translations for zh');
        
        // Test a key to see if it worked
        const test = i18nInstance.t('finance.cashManagement.title', { lng: 'zh' });
        console.log('Cash Management title test:', test);
      } catch (e) {
        console.error('Error adding cash management translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  useEffect(() => {
    // Set the active tab based on the URL parameter
    if (tabParam === "transactions" || tabParam === "reconciliation") {
      setActiveTab(tabParam);
    } else if (tabParam !== null && tabParam !== "accounts") {
      // If an invalid tab is specified, default to accounts
      router.replace("/finance/cash-management?tab=accounts");
    }
  }, [tabParam, router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/finance/cash-management?tab=${value}`);
  };
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-6">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {safeT('finance.cashManagement.title', 'Cash Management')}
        </h1>
        <p className="text-muted-foreground">
          {safeT('finance.cashManagement.subtitle', 'Manage bank accounts, transactions, and reconciliation')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">{safeT('finance.cashManagement.bankAccounts', 'Bank Accounts')}</TabsTrigger>
          <TabsTrigger value="transactions">{safeT('finance.cashManagement.transactions', 'Transactions')}</TabsTrigger>
          <TabsTrigger value="reconciliation">{safeT('finance.cashManagement.reconciliation', 'Reconciliation')}</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <BankAccounts />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Transactions />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Reconciliation />
        </TabsContent>
      </Tabs>
    </div>
  );
} 