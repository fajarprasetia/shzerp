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
  'finance.reconciliation.columns.date': '日期',
  'finance.reconciliation.columns.account': '账户',
  'finance.reconciliation.columns.statementBalance': '对账单余额',
  'finance.reconciliation.columns.bookBalance': '账簿余额',
  'finance.reconciliation.columns.difference': '差额',
  'finance.reconciliation.columns.status': '状态',
  'finance.reconciliation.columns.completed': '已完成',
  'finance.reconciliation.columns.pending': '待处理',
  'finance.reconciliation.columns.actions': '操作',
  'finance.reconciliation.columns.copyReconciliationId': '复制对账 ID',
  'finance.reconciliation.columns.viewDetails': '查看详情',
  'finance.reconciliation.columns.completeReconciliation': '完成对账',
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
    
    console.log(`Forced reconciliation column translation for ${key}: ${translation}`);
    return translation;
  }
  
  // Fallback to default value
  return defaultValue;
};

interface Reconciliation {
  id: string;
  date: string;
  bankAccountId: string;
  bankAccount: {
    accountName: string;
    currency: string;
  };
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: "pending" | "completed";
  notes?: string;
}

export function getColumns(t: TFunction, language: string): ColumnDef<Reconciliation>[] {
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };

  return [
    {
      accessorKey: "date",
      header: safeT("finance.reconciliation.columns.date", "Date"),
      cell: ({ row }) => {
        return new Date(row.getValue("date")).toLocaleDateString();
      },
    },
    {
      accessorKey: "bankAccount.accountName",
      header: safeT("finance.reconciliation.columns.account", "Account"),
    },
    {
      accessorKey: "statementBalance",
      header: safeT("finance.reconciliation.columns.statementBalance", "Statement Balance"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("statementBalance"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.bankAccount.currency,
        }).format(amount);

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "bookBalance",
      header: safeT("finance.reconciliation.columns.bookBalance", "Book Balance"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("bookBalance"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.bankAccount.currency,
        }).format(amount);

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "difference",
      header: safeT("finance.reconciliation.columns.difference", "Difference"),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("difference"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.original.bankAccount.currency,
        }).format(amount);

        return (
          <div className={`font-medium ${amount >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatted}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: safeT("finance.reconciliation.columns.status", "Status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "completed" ? "default" : "secondary"}>
            {status === "completed" 
              ? safeT("finance.reconciliation.columns.completed", "completed")
              : safeT("finance.reconciliation.columns.pending", "pending")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const reconciliation = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{safeT("common.openMenu", "Open menu")}</span>
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(reconciliation.id)}
              >
                {safeT("finance.reconciliation.columns.copyReconciliationId", "Copy reconciliation ID")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {safeT("finance.reconciliation.columns.viewDetails", "View details")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {safeT("finance.reconciliation.columns.completeReconciliation", "Complete reconciliation")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// Export columns with default translations for backward compatibility
export const columns = getColumns((key) => key, 'en'); 