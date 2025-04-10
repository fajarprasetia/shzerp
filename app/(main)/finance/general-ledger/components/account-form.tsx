"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { FinancialAccount } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountForm.name': '账户名称',
  'finance.accountForm.type': '账户类型',
  'finance.accountForm.lowBalanceAlert': '余额不足提醒（可选）',
  'finance.accountForm.selectType': '选择账户类型',
  'finance.accountForm.asset': '资产',
  'finance.accountForm.liability': '负债',
  'finance.accountForm.equity': '权益',
  'finance.accountForm.revenue': '收入',
  'finance.accountForm.expense': '支出',
  'finance.accountForm.cancel': '取消',
  'finance.accountForm.create': '创建',
  'finance.accountForm.update': '更新',
  'finance.accountForm.nameRequired': '名称为必填项',
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
    
    console.log(`Forced account form translation for ${key}: ${translation}`);
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

const AccountType = z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]);

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: AccountType,
  lowBalanceAlert: z.string().optional().nullable()
});

interface AccountFormProps {
  initialData?: FinancialAccount | null;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
}

export function AccountForm({
  initialData,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const [loading, setLoading] = useState(false);
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
      console.log('Ensuring Chinese translations for Account Form');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            accountForm: {
              name: '账户名称',
              type: '账户类型',
              lowBalanceAlert: '余额不足提醒（可选）',
              selectType: '选择账户类型',
              asset: '资产',
              liability: '负债',
              equity: '权益',
              revenue: '收入',
              expense: '支出',
              cancel: '取消',
              create: '创建',
              update: '更新',
              nameRequired: '名称为必填项'
            }
          }
        });
        console.log('Added account form translations for zh');
      } catch (e) {
        console.error('Error adding account form translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type as z.infer<typeof AccountType> || "ASSET",
      lowBalanceAlert: initialData?.lowBalanceAlert?.toString() || null
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      await onSubmit(values);
      form.reset();
    } finally {
      setLoading(false);
    }
  };
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.accountForm.name', 'Account Name')}</FormLabel>
              <FormControl>
                <Input {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.accountForm.type', 'Account Type')}</FormLabel>
              <Select
                disabled={loading}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={safeT('finance.accountForm.selectType', 'Select account type')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ASSET">{safeT('finance.accountForm.asset', 'Asset')}</SelectItem>
                  <SelectItem value="LIABILITY">{safeT('finance.accountForm.liability', 'Liability')}</SelectItem>
                  <SelectItem value="EQUITY">{safeT('finance.accountForm.equity', 'Equity')}</SelectItem>
                  <SelectItem value="REVENUE">{safeT('finance.accountForm.revenue', 'Revenue')}</SelectItem>
                  <SelectItem value="EXPENSE">{safeT('finance.accountForm.expense', 'Expense')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lowBalanceAlert"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.accountForm.lowBalanceAlert', 'Low Balance Alert (Optional)')}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value || ''} 
                  onChange={(e) => field.onChange(e.target.value || null)}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel} type="button" disabled={loading}>
            {safeT('finance.accountForm.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {initialData ? safeT('finance.accountForm.update', 'Update') : safeT('finance.accountForm.create', 'Create')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 