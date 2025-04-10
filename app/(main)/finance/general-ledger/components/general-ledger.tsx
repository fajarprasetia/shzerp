"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Search, Filter, Download, Plus, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.generalLedgerComponent.title': '总账',
  'finance.generalLedgerComponent.description': '管理您的会计科目表',
  'finance.generalLedgerComponent.refresh': '刷新',
  'finance.generalLedgerComponent.newAccount': '新增账户',
  'finance.generalLedgerComponent.searchPlaceholder': '搜索账户...',
  'finance.generalLedgerComponent.filter': '筛选',
  'finance.generalLedgerComponent.export': '导出',
  'finance.generalLedgerComponent.accountName': '账户名称',
  'finance.generalLedgerComponent.type': '类型',
  'finance.generalLedgerComponent.balance': '余额',
  'finance.generalLedgerComponent.status': '状态',
  'finance.generalLedgerComponent.actions': '操作',
  'finance.generalLedgerComponent.noAccountsFound': '未找到账户。',
  'finance.generalLedgerComponent.auto': '自动',
  'finance.generalLedgerComponent.manual': '手动',
  'finance.generalLedgerComponent.lastSynced': '最后同步时间: {{time}}',
  'finance.generalLedgerComponent.never': '从未',
  'finance.generalLedgerComponent.syncingText': '同步中...',
  'finance.generalLedgerComponent.sync': '同步',
  'finance.generalLedgerComponent.edit': '编辑',
  'finance.generalLedgerComponent.showing': '显示 {{filtered}} 个账户（共 {{total}} 个）',
  'finance.generalLedgerComponent.syncLedger': '同步账本',
  'finance.generalLedgerComponent.failedAccounts': '加载账户失败',
  'finance.generalLedgerComponent.failedSync': '同步账户失败',
  'finance.generalLedgerComponent.syncSuccess': '{{name}} 同步成功',
  'finance.generalLedgerComponent.noARAPFound': '未找到应收/应付账户可同步',
  'finance.generalLedgerComponent.syncingARAP': '正在同步应收/应付账户',
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
    
    console.log(`Forced general ledger component translation for ${key}: ${translation}`);
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

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  isAutomated?: boolean;
  lastSynced?: string;
}

export function GeneralLedger() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [syncing, setSyncing] = useState<string | null>(null);
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
      console.log('Ensuring Chinese translations for General Ledger Component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            generalLedgerComponent: {
              title: '总账',
              description: '管理您的会计科目表',
              refresh: '刷新',
              newAccount: '新增账户',
              searchPlaceholder: '搜索账户...',
              filter: '筛选',
              export: '导出',
              accountName: '账户名称',
              type: '类型',
              balance: '余额',
              status: '状态',
              actions: '操作',
              noAccountsFound: '未找到账户。',
              auto: '自动',
              manual: '手动',
              lastSynced: '最后同步时间: {{time}}',
              never: '从未',
              syncingText: '同步中...',
              sync: '同步',
              edit: '编辑',
              showing: '显示 {{filtered}} 个账户（共 {{total}} 个）',
              syncLedger: '同步账本',
              failedAccounts: '加载账户失败',
              failedSync: '同步账户失败',
              syncSuccess: '{{name}} 同步成功',
              noARAPFound: '未找到应收/应付账户可同步',
              syncingARAP: '正在同步应收/应付账户'
            }
          }
        });
        console.log('Added general ledger component translations for zh');
      } catch (e) {
        console.error('Error adding general ledger component translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/finance/accounts");
      if (!response.ok) {
        throw new Error(safeT('finance.generalLedgerComponent.failedAccounts', 'Failed to fetch accounts'));
      }
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error(safeT('finance.generalLedgerComponent.failedAccounts', 'Failed to load accounts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const response = await fetch(`/api/finance/accounts/${accountId}/sync`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error(safeT('finance.generalLedgerComponent.failedSync', 'Failed to sync account'));
      }
      
      const data = await response.json();
      
      // Update the account in the local state
      setAccounts(accounts.map(account => 
        account.id === accountId 
          ? { 
              ...account, 
              balance: data.balance,
              lastSynced: new Date().toISOString()
            } 
          : account
      ));
      
      toast.success(safeT('finance.generalLedgerComponent.syncSuccess', '${data.name} synced successfully', { name: data.name }));
    } catch (error) {
      console.error("Error syncing account:", error);
      toast.error(safeT('finance.generalLedgerComponent.failedSync', 'Failed to sync account'));
    } finally {
      setSyncing(null);
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (sortColumn === "balance") {
      return sortDirection === "asc" 
        ? a.balance - b.balance 
        : b.balance - a.balance;
    } else {
      const aValue = a[sortColumn as keyof Account] as string;
      const bValue = b[sortColumn as keyof Account] as string;
      
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return safeT('finance.generalLedgerComponent.never', 'Never');
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getAccountTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      "asset": "bg-blue-100 text-blue-800",
      "liability": "bg-red-100 text-red-800",
      "equity": "bg-green-100 text-green-800",
      "revenue": "bg-emerald-100 text-emerald-800",
      "expense": "bg-amber-100 text-amber-800",
    };
    
    return typeMap[type.toLowerCase()] || "bg-gray-100 text-gray-800";
  };
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{safeT('finance.generalLedgerComponent.title', 'General Ledger')}</CardTitle>
            <CardDescription>{safeT('finance.generalLedgerComponent.description', 'Manage your chart of accounts')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAccounts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {safeT('finance.generalLedgerComponent.refresh', 'Refresh')}
            </Button>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {safeT('finance.generalLedgerComponent.newAccount', 'New Account')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={safeT('finance.generalLedgerComponent.searchPlaceholder', 'Search accounts...')}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {safeT('finance.generalLedgerComponent.filter', 'Filter')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {safeT('finance.generalLedgerComponent.export', 'Export')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      {safeT('finance.generalLedgerComponent.accountName', 'Account Name')}
                      {sortColumn === "name" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("type")}>
                    <div className="flex items-center">
                      {safeT('finance.generalLedgerComponent.type', 'Type')}
                      {sortColumn === "type" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("balance")}>
                    <div className="flex items-center justify-end">
                      {safeT('finance.generalLedgerComponent.balance', 'Balance')}
                      {sortColumn === "balance" && (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{safeT('finance.generalLedgerComponent.status', 'Status')}</TableHead>
                  <TableHead className="text-right">{safeT('finance.generalLedgerComponent.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {safeT('finance.generalLedgerComponent.noAccountsFound', 'No accounts found.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {account.name}
                          {account.isAutomated && (
                            <Badge variant="outline" className="ml-2 bg-blue-50">
                              {safeT('finance.generalLedgerComponent.auto', 'Auto')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAccountTypeColor(account.type)}>
                          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        {account.isAutomated ? (
                          <div className="text-xs text-muted-foreground">
                            {safeT('finance.generalLedgerComponent.lastSynced', 'Last synced: {{time}}', { time: formatDate(account.lastSynced) })}
                          </div>
                        ) : (
                          <Badge variant="outline">{safeT('finance.generalLedgerComponent.manual', 'Manual')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {account.isAutomated ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={syncing === account.id}
                              onClick={() => handleSync(account.id)}
                            >
                              {syncing === account.id ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  {safeT('finance.generalLedgerComponent.syncingText', 'Syncing...')}
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {safeT('finance.generalLedgerComponent.sync', 'Sync')}
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              {safeT('finance.generalLedgerComponent.edit', 'Edit')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {safeT('finance.generalLedgerComponent.showing', 'Showing {{filtered}} of {{total}} accounts', 
            { filtered: filteredAccounts.length.toString(), total: accounts.length.toString() })}
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const arAccount = accounts.find(a => a.name.toLowerCase().includes("receivable"));
          const apAccount = accounts.find(a => a.name.toLowerCase().includes("payable"));
          
          if (arAccount) {
            handleSync(arAccount.id);
          }
          
          if (apAccount) {
            setTimeout(() => {
              handleSync(apAccount.id);
            }, 1000);
          }
          
          if (!arAccount && !apAccount) {
            toast.error(safeT('finance.generalLedgerComponent.noARAPFound', 'No AR/AP accounts found to sync'));
          } else {
            toast.success(safeT('finance.generalLedgerComponent.syncingARAP', 'Syncing AR/AP accounts'));
          }
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {safeT('finance.generalLedgerComponent.syncLedger', 'Sync Ledger')}
        </Button>
      </CardFooter>
    </Card>
  );
} 