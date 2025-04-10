"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { TFunction } from "i18next";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.bankAccounts.columns.accountName': '账户名称',
  'finance.bankAccounts.columns.accountNumber': '账号',
  'finance.bankAccounts.columns.bankName': '银行名称',
  'finance.bankAccounts.columns.currency': '货币',
  'finance.bankAccounts.columns.balance': '余额',
  'finance.bankAccounts.columns.status': '状态',
  'finance.bankAccounts.columns.actions': '操作',
  'finance.bankAccounts.columns.copyAccountId': '复制账户 ID',
  'finance.bankAccounts.columns.viewTransactions': '查看交易',
  'finance.bankAccounts.columns.editDetails': '编辑详情',
  'finance.bankAccounts.status.active': '活跃',
  'finance.bankAccounts.status.inactive': '不活跃',
  'common.openMenu': '打开菜单'
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
    
    console.log(`Forced bank account columns translation for ${key}: ${translation}`);
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
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: string;
  status: "active" | "inactive";
}

// Helper function to format currency based on type
const formatAccountCurrency = (amount: number, currency: string) => {
  switch (currency) {
    case 'IDR':
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        maximumFractionDigits: 0 
      }).format(amount).replace('Rp', 'Rp.');
    case 'RMB':
      return new Intl.NumberFormat('zh-CN', { 
        style: 'currency', 
        currency: 'CNY' 
      }).format(amount);
    case 'USD':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(amount);
    default:
      return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        maximumFractionDigits: 0 
      }).format(amount).replace('Rp', 'Rp.');
  }
};

// Function that returns i18n-aware columns
export function getColumns(t: TFunction, language: string = 'en'): ColumnDef<BankAccount>[] {
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  return [
    {
      accessorKey: "accountName",
      header: safeT('finance.bankAccounts.columns.accountName', 'Account Name'),
    },
    {
      accessorKey: "accountNumber",
      header: safeT('finance.bankAccounts.columns.accountNumber', 'Account Number'),
    },
    {
      accessorKey: "bankName",
      header: safeT('finance.bankAccounts.columns.bankName', 'Bank Name'),
    },
    {
      accessorKey: "currency",
      header: safeT('finance.bankAccounts.columns.currency', 'Currency'),
      cell: ({ row }) => {
        const currency = row.getValue("currency") as string;
        return <div className="font-medium">{currency}</div>;
      },
    },
    {
      accessorKey: "balance",
      header: safeT('finance.bankAccounts.columns.balance', 'Balance'),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("balance"));
        const currency = row.original.currency;
        const formatted = formatAccountCurrency(amount, currency);

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "status",
      header: safeT('finance.bankAccounts.columns.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status === "active" 
              ? safeT('finance.bankAccounts.status.active', 'active')
              : safeT('finance.bankAccounts.status.inactive', 'inactive')}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{safeT('common.openMenu', 'Open menu')}</span>
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(account.id)}
              >
                {safeT('finance.bankAccounts.columns.copyAccountId', 'Copy account ID')}
              </DropdownMenuItem>
              <DropdownMenuItem>{safeT('finance.bankAccounts.columns.viewTransactions', 'View transactions')}</DropdownMenuItem>
              <DropdownMenuItem>{safeT('finance.bankAccounts.columns.editDetails', 'Edit details')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// Backward compatibility - use English by default
export const columns = getColumns((key) => key); 