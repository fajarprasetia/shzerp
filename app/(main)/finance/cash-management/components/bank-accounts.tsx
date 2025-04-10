"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns, getColumns } from "./bank-account-columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BankAccountForm } from "./bank-account-form";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations with explicit index signature
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.bankAccounts.title': '银行账户',
  'finance.bankAccounts.totalBalance': '总余额',
  'finance.bankAccounts.combinedBalance': '所有账户的总余额',
  'finance.bankAccounts.activeAccounts': '活跃账户',
  'finance.bankAccounts.activeAccountsCount': '活跃银行账户总数',
  'finance.bankAccounts.addAccount': '添加账户',
  'finance.bankAccounts.editAccount': '编辑银行账户',
  'finance.bankAccounts.addNewAccount': '添加新银行账户',
  'finance.bankAccounts.accountUpdated': '银行账户已成功更新',
  'finance.bankAccounts.accountCreated': '银行账户已成功创建',
  'finance.bankAccounts.errorLoading': '加载银行账户时出错',
  'finance.bankAccounts.errorDescription': '加载银行账户时遇到问题。',
  'finance.bankAccounts.tryAgain': '重试',
  'finance.bankAccounts.noAccounts': '未找到银行账户',
  'finance.bankAccounts.noAccountsDescription': '您尚未添加任何银行账户。添加您的第一个账户以开始使用。',
  'finance.bankAccounts.deleteConfirm': '您确定吗？',
  'finance.bankAccounts.deleteDescription': '此操作无法撤销。这将永久删除银行账户及所有相关交易。',
  'finance.bankAccounts.cancel': '取消',
  'finance.bankAccounts.delete': '删除',
  'finance.bankAccounts.accountDeleted': '银行账户已成功删除',
  'finance.bankAccounts.deleteError': '删除银行账户失败。请重试。',
  'common.error': '错误',
  'common.success': '成功',
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
    
    console.log(`Forced bank accounts translation for ${key}: ${translation}`);
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

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Bank Accounts component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            bankAccounts: {
              title: '银行账户',
              totalBalance: '总余额',
              combinedBalance: '所有账户的总余额',
              activeAccounts: '活跃账户',
              activeAccountsCount: '活跃银行账户总数',
              addAccount: '添加账户',
              editAccount: '编辑银行账户',
              addNewAccount: '添加新银行账户',
              accountUpdated: '银行账户已成功更新',
              accountCreated: '银行账户已成功创建',
              errorLoading: '加载银行账户时出错',
              errorDescription: '加载银行账户时遇到问题。',
              tryAgain: '重试',
              noAccounts: '未找到银行账户',
              noAccountsDescription: '您尚未添加任何银行账户。添加您的第一个账户以开始使用。',
              deleteConfirm: '您确定吗？',
              deleteDescription: '此操作无法撤销。这将永久删除银行账户及所有相关交易。',
              cancel: '取消',
              delete: '删除',
              accountDeleted: '银行账户已成功删除',
              deleteError: '删除银行账户失败。请重试。'
            }
          }
        });
        console.log('Added bank accounts translations for zh');
      } catch (e) {
        console.error('Error adding bank accounts translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/finance/bank-accounts", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      setError(safeT("finance.bankAccounts.errorLoading", "Failed to load bank accounts"));
      toast({
        title: safeT("common.error", "Error"),
        description: safeT("finance.bankAccounts.errorDescription", "Failed to load bank accounts. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, language]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/bank-accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      toast({
        title: safeT("common.success", "Success"),
        description: safeT("finance.bankAccounts.accountDeleted", "Bank account deleted successfully"),
      });
      
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting bank account:", error);
      toast({
        title: safeT("common.error", "Error"),
        description: safeT("finance.bankAccounts.deleteError", "Failed to delete bank account. Please try again."),
        variant: "destructive",
      });
    } finally {
      setAccountToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

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

  // Calculate total balance (note: this is simplified and doesn't handle currency conversion)
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const activeAccounts = accounts.filter(a => a.status === "active").length;

  // Get the translated columns
  const enhancedColumns = useMemo(() => {
    const baseColumns = getColumns(t, language).filter(column => column.id !== "actions");
    
    return [
      ...baseColumns,
      {
        id: "actions",
        cell: ({ row }) => {
          const account = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{safeT("common.openMenu", "Open menu")}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {safeT("common.edit", "Edit")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setAccountToDelete(account.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {safeT("common.delete", "Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [t, language]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={safeT("finance.bankAccounts.errorLoading", "Error loading bank accounts")}
          description={safeT("finance.bankAccounts.errorDescription", "We encountered a problem while loading your bank accounts.")}
          icon="alertTriangle"
          action={{
            label: safeT("finance.bankAccounts.tryAgain", "Try Again"),
            onClick: fetchAccounts,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.bankAccounts.totalBalance", "Total Balance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAccountCurrency(totalBalance, 'IDR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {safeT("finance.bankAccounts.combinedBalance", "Combined balance across all accounts")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {safeT("finance.bankAccounts.activeAccounts", "Active Accounts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAccounts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {safeT("finance.bankAccounts.activeAccountsCount", "Total number of active bank accounts")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">{safeT("finance.bankAccounts.title", "Bank Accounts")}</h2>
        <Dialog 
          open={formOpen} 
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingAccount(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              {safeT("finance.bankAccounts.addAccount", "Add Account")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>
              {editingAccount 
                ? safeT("finance.bankAccounts.editAccount", "Edit Bank Account") 
                : safeT("finance.bankAccounts.addNewAccount", "Add New Bank Account")}
            </DialogTitle>
            <BankAccountForm 
              account={editingAccount} 
              onSuccess={() => {
                setFormOpen(false);
                setEditingAccount(null);
                fetchAccounts();
                toast({
                  title: safeT("common.success", "Success"),
                  description: editingAccount 
                    ? safeT("finance.bankAccounts.accountUpdated", "Bank account updated successfully") 
                    : safeT("finance.bankAccounts.accountCreated", "Bank account created successfully"),
                });
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title={safeT("finance.bankAccounts.noAccounts", "No bank accounts found")}
          description={safeT("finance.bankAccounts.noAccountsDescription", "You haven't added any bank accounts yet. Add your first account to get started.")}
          icon="bankNote"
          action={{
            label: safeT("finance.bankAccounts.addAccount", "Add Account"),
            onClick: () => setFormOpen(true),
          }}
        />
      ) : (
        <DataTable
          columns={enhancedColumns}
          data={accounts}
          loading={loading}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{safeT("finance.bankAccounts.deleteConfirm", "Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {safeT("finance.bankAccounts.deleteDescription", "This action cannot be undone. This will permanently delete the bank account and all associated transactions.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{safeT("finance.bankAccounts.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => accountToDelete && handleDeleteAccount(accountToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {safeT("finance.bankAccounts.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 