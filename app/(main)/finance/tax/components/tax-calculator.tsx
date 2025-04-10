"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.tax.calculator.title': '税务计算器',
  'finance.tax.calculator.subtitle': '计算税额和总金额',
  'finance.tax.calculator.amount': '金额',
  'finance.tax.calculator.taxRate': '税率',
  'finance.tax.calculator.taxAmount': '税额',
  'finance.tax.calculator.totalAmount': '总金额',
  'finance.tax.calculator.calculate': '计算',
  'finance.tax.calculator.reset': '重置',
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
    
    console.log(`Forced tax calculator translation for ${key}: ${translation}`);
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

interface TaxCalculatorProps {
  taxRate: number;
}

export function TaxCalculator({ taxRate }: TaxCalculatorProps) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Tax Calculator');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            tax: {
              calculator: {
                title: '税务计算器',
                subtitle: '计算税额和总金额',
                amount: '金额',
                taxRate: '税率',
                taxAmount: '税额',
                totalAmount: '总金额',
                calculate: '计算',
                reset: '重置'
              }
            }
          }
        });
        console.log('Added tax calculator translations for zh');
      } catch (e) {
        console.error('Error adding tax calculator translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  const calculateTax = () => {
    const tax = amount * (taxRate / 100);
    setTaxAmount(tax);
    setTotalAmount(amount + tax);
  };

  const handleReset = () => {
    setAmount(0);
    setTaxAmount(0);
    setTotalAmount(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{safeT('finance.tax.calculator.title', 'Tax Calculator')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              {safeT('finance.tax.calculator.amount', 'Amount')}
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRate">
              {safeT('finance.tax.calculator.taxRate', 'Tax Rate (%)')}
            </Label>
            <Input
              id="taxRate"
              type="number"
              value={taxRate}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxAmount">
              {safeT('finance.tax.calculator.taxAmount', 'Tax Amount')}
            </Label>
            <Input
              id="taxAmount"
              type="number"
              value={taxAmount}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalAmount">
              {safeT('finance.tax.calculator.totalAmount', 'Total Amount')}
            </Label>
            <Input
              id="totalAmount"
              type="number"
              value={totalAmount}
              disabled
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              {safeT('finance.tax.calculator.reset', 'Reset')}
            </Button>
            <Button onClick={calculateTax}>
              {safeT('finance.tax.calculator.calculate', 'Calculate')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 