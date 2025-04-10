"use client";

import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.transactionForm.date': '日期',
  'finance.transactionForm.description': '描述',
  'finance.transactionForm.amount': '金额',
  'finance.transactionForm.type': '类型',
  'finance.transactionForm.selectType': '选择类型',
  'finance.transactionForm.credit': '收入',
  'finance.transactionForm.debit': '支出',
  'finance.transactionForm.category': '类别',
  'finance.transactionForm.selectCategory': '选择类别',
  'finance.transactionForm.bankAccount': '银行账户',
  'finance.transactionForm.selectAccount': '选择账户',
  'finance.transactionForm.createTransaction': '创建交易',
  'finance.transactionForm.creating': '创建中...',
  'finance.transactionForm.validationError': '创建交易失败',
  'finance.transactionForm.categories.salary': '工资',
  'finance.transactionForm.categories.investment': '投资',
  'finance.transactionForm.categories.transfer': '转账',
  'finance.transactionForm.categories.rent': '租金',
  'finance.transactionForm.categories.utilities': '公用事业',
  'finance.transactionForm.categories.food': '食品',
  'finance.transactionForm.categories.transportation': '交通',
  'finance.transactionForm.categories.entertainment': '娱乐',
  'finance.transactionForm.categories.healthcare': '医疗保健',
  'finance.transactionForm.categories.other': '其他',
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
    
    console.log(`Forced transaction form translation for ${key}: ${translation}`);
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

interface BankAccount {
  id: string;
  accountName: string;
  currency: string;
}

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit"]),
  category: z.string().min(1, "Category is required"),
  bankAccountId: z.string().min(1, "Bank account is required"),
});

const categories = [
  "Salary",
  "Investment",
  "Transfer",
  "Rent",
  "Utilities",
  "Food",
  "Transportation",
  "Entertainment",
  "Healthcare",
  "Other",
];

interface TransactionFormProps {
  onSuccess: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Get translated category name
  const getTranslatedCategory = (category: string): string => {
    return safeT(`finance.transactionForm.categories.${category.toLowerCase()}`, category);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Transaction Form component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            transactionForm: {
              date: '日期',
              description: '描述',
              amount: '金额',
              type: '类型',
              selectType: '选择类型',
              credit: '收入',
              debit: '支出',
              category: '类别',
              selectCategory: '选择类别',
              bankAccount: '银行账户',
              selectAccount: '选择账户',
              createTransaction: '创建交易',
              creating: '创建中...',
              validationError: '创建交易失败',
              categories: {
                salary: '工资',
                investment: '投资',
                transfer: '转账',
                rent: '租金',
                utilities: '公用事业',
                food: '食品',
                transportation: '交通',
                entertainment: '娱乐',
                healthcare: '医疗保健',
                other: '其他'
              }
            }
          }
        });
        console.log('Added transaction form translations for zh');
      } catch (e) {
        console.error('Error adding transaction form translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/finance/bank-accounts");
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "credit",
      category: "",
      bankAccountId: "",
    },
  });

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          amount: parseFloat(values.amount),
        }),
      });

      if (!response.ok) {
        throw new Error(safeT("finance.transactionForm.validationError", "Failed to create transaction"));
      }

      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Error creating transaction:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT("finance.transactionForm.date", "Date")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT("finance.transactionForm.description", "Description")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT("finance.transactionForm.amount", "Amount")}</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
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
              <FormLabel>{safeT("finance.transactionForm.type", "Type")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={safeT("finance.transactionForm.selectType", "Select type")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="credit">{safeT("finance.transactionForm.credit", "Credit")}</SelectItem>
                  <SelectItem value="debit">{safeT("finance.transactionForm.debit", "Debit")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT("finance.transactionForm.category", "Category")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={safeT("finance.transactionForm.selectCategory", "Select category")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {getTranslatedCategory(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bankAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT("finance.transactionForm.bankAccount", "Bank Account")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={safeT("finance.transactionForm.selectAccount", "Select account")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading}>
          {loading ? safeT("finance.transactionForm.creating", "Creating...") : safeT("finance.transactionForm.createTransaction", "Create Transaction")}
        </Button>
      </form>
    </Form>
  );
} 