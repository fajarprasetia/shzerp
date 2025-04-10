"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Budget, BUDGET_CATEGORIES } from "@/types/finance";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

const budgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(Object.keys(BUDGET_CATEGORIES) as [keyof typeof BUDGET_CATEGORIES], {
    required_error: "Category is required",
  }),
  amount: z.number().positive("Amount must be positive"),
  period: z.enum(["monthly", "quarterly", "yearly", "custom"], {
    required_error: "Period is required",
  }),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  description: z.string().optional(),
  alertThreshold: z.number().min(0).max(1).default(0.8),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  budget?: Budget | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.budgets.form.title': '预算表单',
  'finance.budgets.form.name': '预算名称',
  'finance.budgets.form.amount': '金额',
  'finance.budgets.form.description': '描述',
  'finance.budgets.form.submit': '提交',
  'finance.budgets.form.cancel': '取消',
  'finance.budgets.form.validation.nameRequired': '请输入预算名称',
  'finance.budgets.form.validation.amountRequired': '请输入金额',
  'finance.budgets.form.validation.amountPositive': '金额必须大于0',
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
    
    console.log(`Forced budget form translation for ${key}: ${translation}`);
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

export function BudgetForm({ budget, onSuccess, onCancel }: BudgetFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: budget
      ? {
          name: budget.name,
          category: budget.category,
          amount: budget.amount,
          period: budget.period || "monthly",
          startDate: format(new Date(budget.startDate), "yyyy-MM-dd"),
          endDate: budget.endDate ? format(new Date(budget.endDate), "yyyy-MM-dd") : undefined,
          description: budget.description || "",
          alertThreshold: budget.alertThreshold || 0.8,
        }
      : {
          name: "",
          category: "supplies",
          amount: 0,
          period: "monthly",
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
          description: "",
          alertThreshold: 0.8,
        },
  });

  const watchPeriod = form.watch("period");

  const onSubmit = async (data: BudgetFormData) => {
    try {
      const payload = {
        ...data,
        alertThreshold: Number(data.alertThreshold),
      };

      // For PUT requests, we need the ID
      if (budget) {
        payload.id = budget.id;
      }

      const response = await fetch("/api/finance/budgets", {
        method: budget ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save budget");
      }

      toast({
        title: "Success",
        description: budget ? "Budget updated" : "Budget created",
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save budget",
      });
    }
  };

  const [mounted, setMounted] = useState(false);

  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Budget Form');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            budgets: {
              form: {
                title: '预算表单',
                name: '预算名称',
                amount: '金额',
                description: '描述',
                submit: '提交',
                cancel: '取消',
                validation: {
                  nameRequired: '请输入预算名称',
                  amountRequired: '请输入金额',
                  amountPositive: '金额必须大于0'
                }
              }
            }
          }
        });
        console.log('Added budget form translations for zh');
      } catch (e) {
        console.error('Error adding budget form translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.budgets.form.name', 'Budget Name')}</FormLabel>
              <FormControl>
                <Input placeholder="Budget name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(BUDGET_CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      {category.label}
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.budgets.form.amount', 'Amount')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? 0 : parseFloat(value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchPeriod === "custom" && (
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.budgets.form.description', 'Description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add notes about this budget"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alertThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert Threshold</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Set a threshold (0.0-1.0) to receive notifications when spending reaches this percentage of your budget
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            {safeT('finance.budgets.form.cancel', 'Cancel')}
          </Button>
          <Button type="submit">
            {safeT('finance.budgets.form.submit', 'Submit')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 