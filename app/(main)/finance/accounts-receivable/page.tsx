"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentTracking from "./components/payment-tracking";
import { AgingReport } from "./components/aging-report";
import { Collections } from "./components/collections";
import { ARReconciliation } from "./components/ar-reconciliation";
import { withPermission } from "@/app/components/with-permission";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";
import { CalendarClock, CreditCard, FileStack, FileText } from "lucide-react";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsReceivable.title': '应收账款',
  'finance.accountsReceivable.subtitle': '管理客户付款，跟踪账龄账户，并处理收款',
  'finance.accountsReceivable.paymentsReceived': '已收付款',
  'finance.accountsReceivable.agingReport': '账龄报告',
  'finance.accountsReceivable.collections': '收款管理',
  'finance.accountsReceivable.reconciliation': '对账'
};

// Direct translation function that bypasses i18n for Chinese
const getDirectTranslation = (key: string, defaultValue: string, language: string): string => {
  if (language === 'zh' && key in ZH_TRANSLATIONS) {
    console.log(`Direct AR translation for ${key}: ${ZH_TRANSLATIONS[key]}`);
    return ZH_TRANSLATIONS[key];
  }
  
  // Check if we have translations in the window object (from layout)
  if (language === 'zh' && typeof window !== 'undefined' && window.__financeTranslations && window.__financeTranslations[key]) {
    return window.__financeTranslations[key];
  }
  
  return defaultValue;
};

export default withPermission(AccountsReceivablePage, "finance", "read");

function AccountsReceivablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "payments";
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();

  useEffect(() => {
    setMounted(true);
    
    // Log current language and translation state
    console.log("AR Page: Current language state:", {
      contextLanguage: language,
      i18nLanguage: i18n.language,
      i18nIsInitialized: i18n.isInitialized
    });
    
    // Force sync with i18n if needed
    if (i18n.language !== language) {
      console.log(`AR Page: Language mismatch - i18n: ${i18n.language}, context: ${language}`);
      i18n.changeLanguage(language).then(() => {
        console.log(`AR Page: Language changed to ${language}`);
      });
    }

    // Test translation
    try {
      const test = t('finance.accountsReceivable.title');
      console.log("AR Page translation test:", test);
    } catch (error) {
      console.error("AR Page translation error:", error);
    }

    // Direct test of translation
    const testTitle = i18n.t('finance.accountsReceivable.title');
    console.log('AR Page translation test:', testTitle);
    
    // Force add Chinese translations if we're in Chinese
    if (i18n.language === 'zh' || language === 'zh') {
      try {
        i18n.addResources('zh', 'translation', {
          finance: {
            accountsReceivable: {
              title: '应收账款',
              subtitle: '管理客户付款，跟踪账龄账户，并处理收款',
              paymentsReceived: '已收付款',
              agingReport: '账龄报告',
              collections: '收款管理',
              reconciliation: '对账'
            }
          }
        });
        console.log('Forced AR translations for zh');
      } catch (e) {
        console.error('Error adding AR translations:', e);
      }
    }
  }, [i18n, language, t]);

  const handleTabChange = (value: string) => {
    router.push(`/finance/accounts-receivable?tab=${value}`);
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-6">{t('common.loading', 'Loading...')}</div>;
  }

  // Get translations with fallbacks
  const title = getDirectTranslation('finance.accountsReceivable.title', 'Accounts Receivable', language);
  const subtitle = getDirectTranslation('finance.accountsReceivable.subtitle', 'Manage customer payments, track aging accounts, and handle collections', language);
  const paymentsReceived = getDirectTranslation('finance.accountsReceivable.paymentsReceived', 'Payments Received', language);
  const agingReport = getDirectTranslation('finance.accountsReceivable.agingReport', 'Aging Report', language);
  const collections = getDirectTranslation('finance.accountsReceivable.collections', 'Collections', language);
  const reconciliation = getDirectTranslation('finance.accountsReceivable.reconciliation', 'Reconciliation', language);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {paymentsReceived}
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {agingReport}
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {collections}
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            {reconciliation}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <PaymentTracking />
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <AgingReport />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <Collections />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <ARReconciliation />
        </TabsContent>
      </Tabs>
    </div>
  );
} 