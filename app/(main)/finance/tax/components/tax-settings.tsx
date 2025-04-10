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
  'finance.tax.settings.title': '税务设置',
  'finance.tax.settings.subtitle': '配置税务计算和申报设置',
  'finance.tax.settings.taxRate': '税率',
  'finance.tax.settings.taxNumber': '税号',
  'finance.tax.settings.taxOffice': '税务局',
  'finance.tax.settings.save': '保存',
  'finance.tax.settings.reset': '重置',
  'finance.tax.settings.success': '设置已保存',
  'finance.tax.settings.error': '保存设置时出错',
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
    
    console.log(`Forced tax settings translation for ${key}: ${translation}`);
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

interface TaxSettingsProps {
  settings: {
    taxRate: number;
    taxNumber: string;
    taxOffice: string;
  };
  onSave: (settings: {
    taxRate: number;
    taxNumber: string;
    taxOffice: string;
  }) => void;
}

export function TaxSettings({ settings, onSave }: TaxSettingsProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState(settings);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Tax Settings');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            tax: {
              settings: {
                title: '税务设置',
                subtitle: '配置税务计算和申报设置',
                taxRate: '税率',
                taxNumber: '税号',
                taxOffice: '税务局',
                save: '保存',
                reset: '重置',
                success: '设置已保存',
                error: '保存设置时出错'
              }
            }
          }
        });
        console.log('Added tax settings translations for zh');
      } catch (e) {
        console.error('Error adding tax settings translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleReset = () => {
    setFormData(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{safeT('finance.tax.settings.title', 'Tax Settings')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">
              {safeT('finance.tax.settings.taxRate', 'Tax Rate (%)')}
            </Label>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxNumber">
              {safeT('finance.tax.settings.taxNumber', 'Tax Number')}
            </Label>
            <Input
              id="taxNumber"
              value={formData.taxNumber}
              onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxOffice">
              {safeT('finance.tax.settings.taxOffice', 'Tax Office')}
            </Label>
            <Input
              id="taxOffice"
              value={formData.taxOffice}
              onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              {safeT('finance.tax.settings.reset', 'Reset')}
            </Button>
            <Button type="submit">
              {safeT('finance.tax.settings.save', 'Save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 