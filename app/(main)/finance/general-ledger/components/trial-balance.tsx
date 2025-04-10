"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { 
  AccountType, 
  TrialBalanceRow, 
  TrialBalanceSummary, 
  TrialBalanceData 
} from "@/types/finance";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.trialBalance.title': '试算表',
  'finance.trialBalance.asOf': '截至:',
  'finance.trialBalance.pickDate': '选择日期',
  'finance.trialBalance.accountCode': '账户代码',
  'finance.trialBalance.accountName': '账户名称',
  'finance.trialBalance.type': '类型',
  'finance.trialBalance.debit': '借方',
  'finance.trialBalance.credit': '贷方',
  'finance.trialBalance.net': '净额',
  'finance.trialBalance.totalDebits': '借方总额',
  'finance.trialBalance.totalCredits': '贷方总额',
  'finance.trialBalance.difference': '差额',
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
    
    console.log(`Forced trial balance translation for ${key}: ${translation}`);
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

interface TrialBalanceProps {}

export function TrialBalance({}: TrialBalanceProps) {
  const [accounts, setAccounts] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
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
      console.log('Ensuring Chinese translations for Trial Balance Component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            trialBalance: {
              title: '试算表',
              asOf: '截至:',
              pickDate: '选择日期',
              accountCode: '账户代码',
              accountName: '账户名称',
              type: '类型',
              debit: '借方',
              credit: '贷方',
              net: '净额',
              totalDebits: '借方总额',
              totalCredits: '贷方总额',
              difference: '差额'
            }
          }
        });
        console.log('Added trial balance translations for zh');
      } catch (e) {
        console.error('Error adding trial balance translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);
  
  const [summary, setSummary] = useState<TrialBalanceSummary>({
    totalDebit: 0,
    totalCredit: 0,
    byType: {
      ASSET: { debit: 0, credit: 0 },
      LIABILITY: { debit: 0, credit: 0 },
      EQUITY: { debit: 0, credit: 0 },
      REVENUE: { debit: 0, credit: 0 },
      EXPENSE: { debit: 0, credit: 0 },
    },
  });

  const columns: ColumnDef<TrialBalanceRow>[] = [
    {
      accessorKey: "code",
      header: safeT('finance.trialBalance.accountCode', 'Account Code'),
    },
    {
      accessorKey: "name",
      header: safeT('finance.trialBalance.accountName', 'Account Name'),
    },
    {
      accessorKey: "type",
      header: safeT('finance.trialBalance.type', 'Type'),
      cell: ({ row }) => {
        const type = row.getValue("type") as AccountType;
        return type.replace(/_/g, " ");
      },
    },
    {
      accessorKey: "debit",
      header: safeT('finance.trialBalance.debit', 'Debit'),
      cell: ({ row }) => formatCurrency(row.getValue("debit") || 0),
    },
    {
      accessorKey: "credit",
      header: safeT('finance.trialBalance.credit', 'Credit'),
      cell: ({ row }) => formatCurrency(row.getValue("credit") || 0),
    },
  ];

  const fetchTrialBalance = async (asOfDate: Date) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/finance/reports/trial-balance?date=${asOfDate.toISOString()}`
      );
      if (response.ok) {
        const data: TrialBalanceData = await response.json();
        setAccounts(data.accounts);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance(date);
  }, [date]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{safeT('finance.trialBalance.title', 'Trial Balance')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{safeT('finance.trialBalance.asOf', 'As of:')}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] pl-3 text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "PPP") : <span>{safeT('finance.trialBalance.pickDate', 'Pick a date')}</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Object.entries(summary.byType).map(([type, totals]) => (
          <div key={type} className="p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">
              {type.replace(/_/g, " ")}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{safeT('finance.trialBalance.debit', 'Debit')}:</span>
                <span>{formatCurrency(totals.debit)}</span>
              </div>
              <div className="flex justify-between">
                <span>{safeT('finance.trialBalance.credit', 'Credit')}:</span>
                <span>{formatCurrency(totals.credit)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>{safeT('finance.trialBalance.net', 'Net')}:</span>
                <span>{formatCurrency(totals.debit - totals.credit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="name"
        />
      </div>

      <div className="flex justify-end gap-8 text-sm">
        <div className="space-y-1">
          <div className="font-medium">{safeT('finance.trialBalance.totalDebits', 'Total Debits')}</div>
          <div className="text-right">{formatCurrency(summary.totalDebit)}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium">{safeT('finance.trialBalance.totalCredits', 'Total Credits')}</div>
          <div className="text-right">{formatCurrency(summary.totalCredit)}</div>
        </div>
        <div className="space-y-1">
          <div className="font-medium">{safeT('finance.trialBalance.difference', 'Difference')}</div>
          <div className="text-right">
            {formatCurrency(Math.abs(summary.totalDebit - summary.totalCredit))}
          </div>
        </div>
      </div>
    </div>
  );
} 