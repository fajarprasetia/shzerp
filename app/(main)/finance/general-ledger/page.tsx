"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartOfAccounts } from "./components/chart-of-accounts";
import { JournalEntries } from "./components/journal-entries";
import { GeneralLedger } from "./components/general-ledger";
import { TrialBalance } from "./components/trial-balance";
import { withPermission } from "@/app/components/with-permission";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.generalLedger.title': '总账',
  'finance.generalLedger.subtitle': '管理您的会计科目表、会计分录并查看财务报表',
  'finance.generalLedger.chartOfAccounts': '会计科目表',
  'finance.generalLedger.journalEntries': '会计分录',
  'finance.generalLedger.generalLedger': '总账',
  'finance.generalLedger.trialBalance': '试算表',
  'common.loading': '加载中...',
  'finance.generalLedgerPage.title': '总账',
  'finance.generalLedgerPage.subtitle': '查看和管理您的财务账户和交易',
  'finance.generalLedgerPage.tabLedger': '总账',
  'finance.generalLedgerPage.tabAccounts': '科目表'
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
    
    console.log(`Forced general ledger translation for ${key}: ${translation}`);
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

export default withPermission(GeneralLedgerPage, "finance", "read");

function GeneralLedgerPage() {
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
      console.log('Ensuring Chinese translations for General Ledger');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            generalLedger: {
              title: '总账',
              subtitle: '管理您的会计科目表、会计分录并查看财务报表',
              chartOfAccounts: '会计科目表',
              journalEntries: '会计分录',
              generalLedger: '总账',
              trialBalance: '试算表'
            }
          }
        });
        console.log('Added general ledger translations for zh');
      } catch (e) {
        console.error('Error adding general ledger translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{safeT('finance.generalLedger.title', 'General Ledger')}</h1>
        <p className="text-muted-foreground">
          {safeT('finance.generalLedger.subtitle', 'Manage your chart of accounts, journal entries, and view financial reports')}
        </p>
      </div>

      <Tabs defaultValue="chart-of-accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart-of-accounts">{safeT('finance.generalLedger.chartOfAccounts', 'Chart of Accounts')}</TabsTrigger>
          <TabsTrigger value="journal-entries">{safeT('finance.generalLedger.journalEntries', 'Journal Entries')}</TabsTrigger>
          <TabsTrigger value="general-ledger">{safeT('finance.generalLedger.generalLedger', 'General Ledger')}</TabsTrigger>
          <TabsTrigger value="trial-balance">{safeT('finance.generalLedger.trialBalance', 'Trial Balance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="journal-entries">
          <JournalEntries />
        </TabsContent>

        <TabsContent value="general-ledger">
          <GeneralLedger />
        </TabsContent>

        <TabsContent value="trial-balance">
          <TrialBalance />
        </TabsContent>
      </Tabs>
    </div>
  );
} 