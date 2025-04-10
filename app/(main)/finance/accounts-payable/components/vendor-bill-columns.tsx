"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { TFunction } from "i18next";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.vendorBill.columns.billNo': '账单编号',
  'finance.vendorBill.columns.vendor': '供应商',
  'finance.vendorBill.columns.amount': '金额',
  'finance.vendorBill.columns.billDate': '账单日期',
  'finance.vendorBill.columns.dueDate': '到期日',
  'finance.vendorBill.columns.status': '状态',
  'finance.vendorBill.statuses.paid': '已付款',
  'finance.vendorBill.statuses.pending': '待处理',
  'finance.vendorBill.statuses.overdue': '逾期',
  'finance.vendorBill.statuses.draft': '草稿',
  'finance.vendorBill.actions.copyId': '复制账单 ID',
  'finance.vendorBill.actions.viewDetails': '查看详情',
  'finance.vendorBill.actions.updateStatus': '更新状态',
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
    
    console.log(`Forced vendor bill columns translation for ${key}: ${translation}`);
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

interface VendorBill {
  id: string;
  billNo: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  billDate: Date;
  status: "draft" | "pending" | "paid" | "overdue";
  notes?: string;
}

export function getColumns(t: TFunction, language: string = 'en'): ColumnDef<VendorBill>[] {
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  return [
    {
      accessorKey: "billNo",
      header: safeT('finance.vendorBill.columns.billNo', 'Bill No'),
    },
    {
      accessorKey: "vendorName",
      header: safeT('finance.vendorBill.columns.vendor', 'Vendor'),
    },
    {
      accessorKey: "amount",
      header: safeT('finance.vendorBill.columns.amount', 'Amount'),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(amount);
        return formatted;
      },
    },
    {
      accessorKey: "billDate",
      header: safeT('finance.vendorBill.columns.billDate', 'Bill Date'),
      cell: ({ row }) => format(new Date(row.getValue("billDate")), "MMM d, yyyy"),
    },
    {
      accessorKey: "dueDate",
      header: safeT('finance.vendorBill.columns.dueDate', 'Due Date'),
      cell: ({ row }) => format(new Date(row.getValue("dueDate")), "MMM d, yyyy"),
    },
    {
      accessorKey: "status",
      header: safeT('finance.vendorBill.columns.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "paid"
                ? "success"
                : status === "overdue"
                ? "destructive"
                : status === "draft"
                ? "secondary"
                : "default"
            }
          >
            {status === "paid" 
              ? safeT('finance.vendorBill.statuses.paid', 'Paid')
              : status === "overdue"
              ? safeT('finance.vendorBill.statuses.overdue', 'Overdue')
              : status === "draft"
              ? safeT('finance.vendorBill.statuses.draft', 'Draft')
              : safeT('finance.vendorBill.statuses.pending', 'Pending')}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bill = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{safeT('common.openMenu', 'Open menu')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(bill.id)}
              >
                {safeT('finance.vendorBill.actions.copyId', 'Copy bill ID')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {safeT('finance.vendorBill.actions.viewDetails', 'View details')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {safeT('finance.vendorBill.actions.updateStatus', 'Update status')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
} 