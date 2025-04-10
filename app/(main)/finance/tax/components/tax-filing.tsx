"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.tax.filing.title': '税务申报',
  'finance.tax.filing.subtitle': '管理税务申报和文件',
  'finance.tax.filing.status': '状态',
  'finance.tax.filing.dueDate': '截止日期',
  'finance.tax.filing.amount': '金额',
  'finance.tax.filing.pending': '待处理',
  'finance.tax.filing.submitted': '已提交',
  'finance.tax.filing.approved': '已批准',
  'finance.tax.filing.rejected': '已拒绝',
  'finance.tax.filing.view': '查看',
  'finance.tax.filing.submit': '提交',
  'finance.tax.filing.noData': '没有可用的税务申报数据',
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
    
    console.log(`Forced tax filing translation for ${key}: ${translation}`);
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

interface TaxFilingProps {
  filings: Array<{
    id: string;
    type: string;
    status: string;
    dueDate: string;
    amount: number;
  }>;
  onView: (id: string) => void;
  onSubmit: (id: string) => void;
}

export function TaxFiling({ filings, onView, onSubmit }: TaxFilingProps) {
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
      console.log('Ensuring Chinese translations for Tax Filing');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            tax: {
              filing: {
                title: '税务申报',
                subtitle: '管理税务申报和文件',
                status: '状态',
                dueDate: '截止日期',
                amount: '金额',
                pending: '待处理',
                submitted: '已提交',
                approved: '已批准',
                rejected: '已拒绝',
                view: '查看',
                submit: '提交',
                noData: '没有可用的税务申报数据'
              }
            }
          }
        });
        console.log('Added tax filing translations for zh');
      } catch (e) {
        console.error('Error adding tax filing translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  if (filings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            {safeT('finance.tax.filing.noData', 'No tax filing data available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filings.map((filing) => (
        <Card key={filing.id}>
          <CardHeader>
            <CardTitle>{filing.type}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{safeT('finance.tax.filing.status', 'Status')}</span>
                <span className={`font-medium ${
                  filing.status === 'pending' ? 'text-yellow-500' :
                  filing.status === 'submitted' ? 'text-blue-500' :
                  filing.status === 'approved' ? 'text-green-500' :
                  'text-red-500'
                }`}>
                  {safeT(`finance.tax.filing.${filing.status}`, filing.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{safeT('finance.tax.filing.dueDate', 'Due Date')}</span>
                <span>{new Date(filing.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{safeT('finance.tax.filing.amount', 'Amount')}</span>
                <span>{new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(filing.amount)}</span>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => onView(filing.id)}>
                  {safeT('finance.tax.filing.view', 'View')}
                </Button>
                {filing.status === 'pending' && (
                  <Button onClick={() => onSubmit(filing.id)}>
                    {safeT('finance.tax.filing.submit', 'Submit')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 