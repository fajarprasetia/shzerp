"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.bankAccountForm.accountName': '账户名称',
  'finance.bankAccountForm.accountNamePlaceholder': '主营业账户',
  'finance.bankAccountForm.accountNameDescription': '您用于识别此账户的名称',
  'finance.bankAccountForm.accountNumber': '账号',
  'finance.bankAccountForm.accountNumberPlaceholder': '123456789',
  'finance.bankAccountForm.accountNumberDescription': '您的银行账号',
  'finance.bankAccountForm.bankName': '银行名称',
  'finance.bankAccountForm.bankNamePlaceholder': 'BCA',
  'finance.bankAccountForm.bankNameDescription': '银行的名称',
  'finance.bankAccountForm.initialBalance': '初始余额',
  'finance.bankAccountForm.balanceDescription': '所选货币的当前余额',
  'finance.bankAccountForm.currency': '货币',
  'finance.bankAccountForm.currencyDescription': '此账户的货币',
  'finance.bankAccountForm.selectCurrency': '选择货币',
  'finance.bankAccountForm.idr': 'IDR - 印尼盾',
  'finance.bankAccountForm.rmb': 'RMB - 人民币',
  'finance.bankAccountForm.usd': 'USD - 美元',
  'finance.bankAccountForm.status': '状态',
  'finance.bankAccountForm.statusDescription': '此账户目前是否使用中',
  'finance.bankAccountForm.selectStatus': '选择状态',
  'finance.bankAccountForm.active': '活跃',
  'finance.bankAccountForm.inactive': '不活跃',
  'finance.bankAccountForm.description': '描述（可选）',
  'finance.bankAccountForm.descriptionPlaceholder': '关于此账户的其他说明',
  'finance.bankAccountForm.cancel': '取消',
  'finance.bankAccountForm.createAccount': '创建账户',
  'finance.bankAccountForm.updateAccount': '更新账户',
  'finance.bankAccountForm.creating': '创建中...',
  'finance.bankAccountForm.updating': '更新中...',
  'finance.bankAccountForm.saveError': '保存银行账户失败',
  'finance.bankAccountForm.accountCreated': '银行账户已成功创建',
  'finance.bankAccountForm.accountUpdated': '银行账户已成功更新',
  'finance.bankAccountForm.validation.accountName': '账户名称至少需要3个字符',
  'finance.bankAccountForm.validation.accountNumber': '账号至少需要5个字符',
  'finance.bankAccountForm.validation.bankName': '银行名称至少需要2个字符',
  'finance.bankAccountForm.validation.balance': '余额不能为负数',
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
    
    console.log(`Forced bank account form translation for ${key}: ${translation}`);
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

// Form schema with validation
const formSchema = z.object({
  accountName: z.string().min(3, "Account name must be at least 3 characters"),
  accountNumber: z.string().min(5, "Account number must be at least 5 characters"),
  bankName: z.string().min(2, "Bank name must be at least 2 characters"),
  balance: z.coerce.number().min(0, "Balance cannot be negative"),
  currency: z.string().default("IDR"),
  status: z.enum(["active", "inactive"]).default("active"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BankAccountFormProps {
  account?: any;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function BankAccountForm({ account, onSuccess, onCancel }: BankAccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  const isEditing = !!account;
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Bank Account Form component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            bankAccountForm: {
              accountName: '账户名称',
              accountNamePlaceholder: '主营业账户',
              accountNameDescription: '您用于识别此账户的名称',
              accountNumber: '账号',
              accountNumberPlaceholder: '123456789',
              accountNumberDescription: '您的银行账号',
              bankName: '银行名称',
              bankNamePlaceholder: 'BCA',
              bankNameDescription: '银行的名称',
              initialBalance: '初始余额',
              balanceDescription: '所选货币的当前余额',
              currency: '货币',
              currencyDescription: '此账户的货币',
              selectCurrency: '选择货币',
              idr: 'IDR - 印尼盾',
              rmb: 'RMB - 人民币',
              usd: 'USD - 美元',
              status: '状态',
              statusDescription: '此账户目前是否使用中',
              selectStatus: '选择状态',
              active: '活跃',
              inactive: '不活跃',
              description: '描述（可选）',
              descriptionPlaceholder: '关于此账户的其他说明',
              cancel: '取消',
              createAccount: '创建账户',
              updateAccount: '更新账户',
              creating: '创建中...',
              updating: '更新中...',
              saveError: '保存银行账户失败',
              accountCreated: '银行账户已成功创建',
              accountUpdated: '银行账户已成功更新',
              validation: {
                accountName: '账户名称至少需要3个字符',
                accountNumber: '账号至少需要5个字符',
                bankName: '银行名称至少需要2个字符',
                balance: '余额不能为负数'
              }
            }
          }
        });
        console.log('Added bank account form translations for zh');
      } catch (e) {
        console.error('Error adding bank account form translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  // Get translated validation messages
  const getValidationMessage = (path: string, defaultMessage: string) => {
    if (language === 'zh') {
      const key = `finance.bankAccountForm.validation.${path}`;
      return safeT(key, defaultMessage);
    }
    return defaultMessage;
  };

  // Initialize form with default values or existing account data
  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        accountName: z.string().min(3, getValidationMessage('accountName', 'Account name must be at least 3 characters')),
        accountNumber: z.string().min(5, getValidationMessage('accountNumber', 'Account number must be at least 5 characters')),
        bankName: z.string().min(2, getValidationMessage('bankName', 'Bank name must be at least 2 characters')),
        balance: z.coerce.number().min(0, getValidationMessage('balance', 'Balance cannot be negative')),
        currency: z.string().default("IDR"),
        status: z.enum(["active", "inactive"]).default("active"),
        description: z.string().optional(),
      })
    ),
    defaultValues: {
      accountName: account?.accountName || "",
      accountNumber: account?.accountNumber || "",
      bankName: account?.bankName || "",
      balance: account?.balance || 0,
      currency: account?.currency || "IDR",
      status: account?.status || "active",
      description: account?.description || "",
    },
  });
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/finance/bank-accounts/${account.id}`
        : "/api/finance/bank-accounts";
      
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || safeT('finance.bankAccountForm.saveError', 'Failed to save bank account'));
      }

      toast.success(
        isEditing 
          ? safeT('finance.bankAccountForm.accountUpdated', 'Bank account updated successfully') 
          : safeT('finance.bankAccountForm.accountCreated', 'Bank account created successfully')
      );
      onSuccess();
    } catch (error) {
      console.error("Error saving bank account:", error);
      toast.error(error instanceof Error ? error.message : safeT('finance.bankAccountForm.saveError', 'Failed to save bank account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.bankAccountForm.accountName', 'Account Name')}</FormLabel>
                <FormControl>
                  <Input placeholder={safeT('finance.bankAccountForm.accountNamePlaceholder', 'Main Business Account')} {...field} />
                </FormControl>
                <FormDescription>
                  {safeT('finance.bankAccountForm.accountNameDescription', 'The name you use to identify this account')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.bankAccountForm.accountNumber', 'Account Number')}</FormLabel>
                <FormControl>
                  <Input placeholder={safeT('finance.bankAccountForm.accountNumberPlaceholder', '123456789')} {...field} />
                </FormControl>
                <FormDescription>
                  {safeT('finance.bankAccountForm.accountNumberDescription', 'The account number from your bank')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.bankAccountForm.bankName', 'Bank Name')}</FormLabel>
                <FormControl>
                  <Input placeholder={safeT('finance.bankAccountForm.bankNamePlaceholder', 'BCA')} {...field} />
                </FormControl>
                <FormDescription>
                  {safeT('finance.bankAccountForm.bankNameDescription', 'The name of the bank')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.bankAccountForm.initialBalance', 'Initial Balance')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "0" : e.target.value;
                      field.onChange(parseFloat(value));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {safeT('finance.bankAccountForm.balanceDescription', 'The current balance in the selected currency')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.bankAccountForm.currency', 'Currency')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={safeT('finance.bankAccountForm.selectCurrency', 'Select currency')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IDR">{safeT('finance.bankAccountForm.idr', 'IDR - Indonesian Rupiah')}</SelectItem>
                    <SelectItem value="RMB">{safeT('finance.bankAccountForm.rmb', 'RMB - Chinese Yuan')}</SelectItem>
                    <SelectItem value="USD">{safeT('finance.bankAccountForm.usd', 'USD - US Dollar')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {safeT('finance.bankAccountForm.currencyDescription', 'The currency of this account')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.bankAccountForm.status', 'Status')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={safeT('finance.bankAccountForm.selectStatus', 'Select status')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">{safeT('finance.bankAccountForm.active', 'Active')}</SelectItem>
                    <SelectItem value="inactive">{safeT('finance.bankAccountForm.inactive', 'Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {safeT('finance.bankAccountForm.statusDescription', 'Whether this account is currently in use')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.bankAccountForm.description', 'Description (Optional)')}</FormLabel>
              <FormControl>
                <Input placeholder={safeT('finance.bankAccountForm.descriptionPlaceholder', 'Additional notes about this account')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {safeT('finance.bankAccountForm.cancel', 'Cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 
                  safeT('finance.bankAccountForm.updating', 'Updating...') : 
                  safeT('finance.bankAccountForm.creating', 'Creating...')}
              </>
            ) : (
              isEditing ? 
                safeT('finance.bankAccountForm.updateAccount', 'Update Account') : 
                safeT('finance.bankAccountForm.createAccount', 'Create Account')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 