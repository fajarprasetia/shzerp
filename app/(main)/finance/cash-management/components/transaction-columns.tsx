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
  'finance.transactions.columns.date': '日期',
  'finance.transactions.columns.description': '描述',
  'finance.transactions.columns.account': '账户',
  'finance.transactions.columns.category': '类别',
  'finance.transactions.columns.type': '类型',
  'finance.transactions.columns.amount': '金额',
  'finance.transactions.columns.credit': '收入',
  'finance.transactions.columns.debit': '支出',
  'finance.transactions.columns.actions': '操作',
  'finance.transactions.columns.copyTransactionId': '复制交易 ID',
  'finance.transactions.columns.viewDetails': '查看详情',
  'finance.transactions.columns.editTransaction': '编辑交易',
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
    
    console.log(`Forced transaction columns translation for ${key}: ${translation}`);
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

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
}

// Format currency based on currency type
const formatCurrency = (amount: number, currency: string) => {
  switch (currency) {
    case 'IDR':
      return `Rp. ${amount.toLocaleString('id-ID')}`;
    case 'RMB':
      return `¥ ${amount.toLocaleString('zh-CN')}`;
    case 'USD':
      return `$ ${amount.toLocaleString('en-US')}`;
    default:
      // Default to IDR if currency is not specified
      return `Rp. ${amount.toLocaleString('id-ID')}`;
  }
};

// Function that returns i18n-aware columns
export function getColumns(t: TFunction, language: string = 'en'): ColumnDef<Transaction>[] {
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  return [
    {
      accessorKey: "date",
      header: safeT('finance.transactions.columns.date', 'Date'),
      cell: ({ row }) => {
        return new Date(row.getValue("date")).toLocaleDateString();
      },
    },
    {
      accessorKey: "description",
      header: safeT('finance.transactions.columns.description', 'Description'),
    },
    {
      accessorKey: "bankAccount.accountName",
      header: safeT('finance.transactions.columns.account', 'Account'),
    },
    {
      accessorKey: "category",
      header: safeT('finance.transactions.columns.category', 'Category'),
    },
    {
      accessorKey: "type",
      header: safeT('finance.transactions.columns.type', 'Type'),
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant={type === "credit" ? "default" : "destructive"}>
            {type === "credit" 
              ? safeT('finance.transactions.columns.credit', 'credit')
              : safeT('finance.transactions.columns.debit', 'debit')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: safeT('finance.transactions.columns.amount', 'Amount'),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        const currency = row.original.bankAccount?.currency || 'IDR';
        const formatted = formatCurrency(amount, currency);

        return (
          <div className={`font-medium ${row.original.type === "credit" ? "text-green-600" : "text-red-600"}`}>
            {formatted}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;

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
                onClick={() => navigator.clipboard.writeText(transaction.id)}
              >
                {safeT('finance.transactions.columns.copyTransactionId', 'Copy transaction ID')}
              </DropdownMenuItem>
              <DropdownMenuItem>{safeT('finance.transactions.columns.viewDetails', 'View details')}</DropdownMenuItem>
              <DropdownMenuItem>{safeT('finance.transactions.columns.editTransaction', 'Edit transaction')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// Backward compatibility - use English by default
export const columns = getColumns((key) => key); 