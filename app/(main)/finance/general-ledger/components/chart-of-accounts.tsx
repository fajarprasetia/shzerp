"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountForm } from "./account-form";
import { useToast } from "@/components/ui/use-toast";
import { FinancialAccount } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.chartOfAccounts.title': '会计科目表',
  'finance.chartOfAccounts.addAccount': '添加账户',
  'finance.chartOfAccounts.editAccount': '编辑账户',
  'finance.chartOfAccounts.createAccount': '创建新账户',
  'finance.chartOfAccounts.accountName': '账户名称',
  'finance.chartOfAccounts.type': '类型',
  'finance.chartOfAccounts.category': '类别',
  'finance.chartOfAccounts.balance': '余额',
  'finance.chartOfAccounts.actions': '操作',
  'finance.chartOfAccounts.edit': '编辑',
  'finance.chartOfAccounts.na': '无',
  'finance.chartOfAccounts.success': '成功',
  'finance.chartOfAccounts.accountUpdated': '账户 {{name}} 已更新。',
  'finance.chartOfAccounts.accountCreated': '账户 {{name}} 已创建。',
  'finance.chartOfAccounts.error': '错误',
  'finance.chartOfAccounts.failedToFetch': '获取账户列表失败',
  'finance.chartOfAccounts.failedToSave': '保存账户失败',
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
    
    console.log(`Forced chart of accounts translation for ${key}: ${translation}`);
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

// Define required accounts with their proper structure
const REQUIRED_ACCOUNTS = [
  // Asset Accounts
  {
    name: "Cash",
    type: "ASSET",
    description: "Cash on hand and in bank",
    currency: "IDR",
    lowBalanceAlert: 1000000 // 1 million IDR
  },
  {
    name: "Accounts Receivable",
    type: "ASSET",
    description: "Amounts owed by customers",
    currency: "IDR"
  },
  {
    name: "Inventory",
    type: "ASSET",
    description: "Value of goods in stock",
    currency: "IDR"
  },
  // Liability Accounts
  {
    name: "Accounts Payable",
    type: "LIABILITY",
    description: "Amounts owed to vendors",
    currency: "IDR"
  },
  // Equity Accounts
  {
    name: "Retained Earnings",
    type: "EQUITY",
    description: "Accumulated earnings",
    currency: "IDR"
  },
  // Revenue Accounts
  {
    name: "Sales Revenue",
    type: "REVENUE",
    description: "Income from sales",
    currency: "IDR"
  },
  // Expense Accounts
  {
    name: "Cost of Goods Sold",
    type: "EXPENSE",
    description: "Direct cost of goods sold",
    currency: "IDR"
  },
];

export function ChartOfAccounts() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
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
      console.log('Ensuring Chinese translations for Chart of Accounts');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            chartOfAccounts: {
              title: '会计科目表',
              addAccount: '添加账户',
              editAccount: '编辑账户',
              createAccount: '创建新账户',
              accountName: '账户名称',
              type: '类型',
              category: '类别',
              balance: '余额',
              actions: '操作',
              edit: '编辑',
              na: '无',
              success: '成功',
              accountUpdated: '账户 {{name}} 已更新。',
              accountCreated: '账户 {{name}} 已创建。',
              error: '错误',
              failedToFetch: '获取账户列表失败',
              failedToSave: '保存账户失败'
            }
          }
        });
        console.log('Added chart of accounts translations for zh');
      } catch (e) {
        console.error('Error adding chart of accounts translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const columns: ColumnDef<FinancialAccount>[] = [
    {
      accessorKey: "name",
      header: safeT('finance.chartOfAccounts.accountName', 'Account Name'),
    },
    {
      accessorKey: "type",
      header: safeT('finance.chartOfAccounts.type', 'Type'),
    },
    {
      accessorKey: "category",
      header: safeT('finance.chartOfAccounts.category', 'Category'),
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return category ? category.replace(/_/g, " ") : safeT('finance.chartOfAccounts.na', 'N/A');
      },
    },
    {
      accessorKey: "balance",
      header: safeT('finance.chartOfAccounts.balance', 'Balance'),
      cell: ({ row }) => {
        const balance = parseFloat(row.getValue("balance"));
        return !isNaN(balance) ? formatCurrency(balance) : formatCurrency(0);
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAccount(account);
                setShowForm(true);
              }}
            >
              {safeT('finance.chartOfAccounts.edit', 'Edit')}
            </Button>
          </div>
        );
      },
    },
  ];

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/finance/accounts");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || safeT('finance.chartOfAccounts.failedToFetch', 'Failed to fetch accounts'));
      }
      const data = await response.json();
      setAccounts(data);

      // Check if required accounts exist
      const existingAccounts = new Set(data.map((acc: FinancialAccount) => acc.name));
      const missingAccounts = REQUIRED_ACCOUNTS.filter(
        (acc) => !existingAccounts.has(acc.name)
      );

      // Create missing required accounts
      if (missingAccounts.length > 0) {
        for (const account of missingAccounts) {
          await handleSubmit(account);
        }
        // Refresh the accounts list
        const updatedResponse = await fetch("/api/finance/accounts");
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setAccounts(updatedData);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast({
        title: safeT('finance.chartOfAccounts.error', 'Error'),
        description: error instanceof Error ? error.message : safeT('finance.chartOfAccounts.failedToFetch', 'Failed to fetch accounts'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (accountData: Partial<FinancialAccount>) => {
    try {
      const response = await fetch(
        selectedAccount
          ? `/api/finance/accounts/${selectedAccount.id}`
          : "/api/finance/accounts",
        {
          method: selectedAccount ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(accountData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || safeT('finance.chartOfAccounts.failedToSave', 'Failed to save account'));
      }

      const savedAccount = await response.json();

      setAccounts((prev) =>
        selectedAccount
          ? prev.map((acc) =>
              acc.id === savedAccount.id ? savedAccount : acc
            )
          : [...prev, savedAccount]
      );

      toast({
        title: safeT('finance.chartOfAccounts.success', 'Success'),
        description: selectedAccount 
          ? safeT('finance.chartOfAccounts.accountUpdated', `Account ${savedAccount.name} has been updated.`, { name: savedAccount.name })
          : safeT('finance.chartOfAccounts.accountCreated', `Account ${savedAccount.name} has been created.`, { name: savedAccount.name }),
      });

      setShowForm(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        title: safeT('finance.chartOfAccounts.error', 'Error'),
        description: error instanceof Error ? error.message : safeT('finance.chartOfAccounts.failedToSave', 'Failed to save account'),
        variant: "destructive",
      });
    }
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{safeT('finance.chartOfAccounts.title', 'Chart of Accounts')}</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {safeT('finance.chartOfAccounts.addAccount', 'Add Account')}
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAccount 
                ? safeT('finance.chartOfAccounts.editAccount', 'Edit Account') 
                : safeT('finance.chartOfAccounts.createAccount', 'Create New Account')}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            initialData={selectedAccount}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={accounts}
          searchKey="name"
        />
      </div>
    </div>
  );
} 