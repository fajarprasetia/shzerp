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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.reconciliationForm.date': '日期',
  'finance.reconciliationForm.bankAccount': '银行账户',
  'finance.reconciliationForm.selectBankAccount': '选择银行账户',
  'finance.reconciliationForm.statementBalance': '对账单余额',
  'finance.reconciliationForm.notes': '备注',
  'finance.reconciliationForm.manualReconciliation': '手动对账',
  'finance.reconciliationForm.autoReconciliation': '自动对账',
  'finance.reconciliationForm.creating': '创建中...',
  'finance.reconciliationForm.createReconciliation': '创建对账',
  'finance.reconciliationForm.autoReconcile': '自动对账',
  'finance.reconciliationForm.autoReconciling': '自动对账中...',
  'finance.reconciliationForm.processing': '处理中...',
  'finance.reconciliationForm.autoReconcileTransactions': '自动对账交易',
  'finance.reconciliationForm.autoReconcileDescription': '自动匹配交易并标记为已对账',
  'finance.reconciliationForm.errorCreating': '创建对账失败',
  'finance.reconciliationForm.errorAutoReconcile': '自动对账失败',
  'finance.reconciliationForm.success': '成功',
  'finance.reconciliationForm.successMessage': '对账创建成功',
  'finance.reconciliationForm.autoReconciliationComplete': '自动对账完成',
  'finance.reconciliationForm.partialReconciliation': '部分对账',
  'finance.reconciliationForm.reconciledTransactions': '成功对账交易 {{count}} 笔',
  'finance.reconciliationForm.manualReviewRequired': '发现差额 {{difference}}。需要手动检查。',
  'common.error': '错误'
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
    
    console.log(`Forced reconciliation form translation for ${key}: ${translation}`);
    return translation;
  }
  
  // Fallback to default value
  return defaultValue;
};

interface BankAccount {
  id: string;
  accountName: string;
  currency: string;
  balance: number;
}

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  bankAccountId: z.string().min(1, "Bank account is required"),
  statementBalance: z.string().min(1, "Statement balance is required"),
  notes: z.string().optional(),
  autoReconcile: z.boolean().optional(),
});

interface ReconciliationFormProps {
  onSuccess: () => void;
}

export function ReconciliationForm({ onSuccess }: ReconciliationFormProps) {
  const [loading, setLoading] = useState(false);
  const [autoReconciling, setAutoReconciling] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
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
      console.log('Ensuring Chinese translations for Reconciliation Form component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            reconciliationForm: {
              date: '日期',
              bankAccount: '银行账户',
              selectBankAccount: '选择银行账户',
              statementBalance: '对账单余额',
              notes: '备注',
              manualReconciliation: '手动对账',
              autoReconciliation: '自动对账',
              creating: '创建中...',
              createReconciliation: '创建对账',
              autoReconcile: '自动对账',
              autoReconciling: '自动对账中...',
              processing: '处理中...',
              autoReconcileTransactions: '自动对账交易',
              autoReconcileDescription: '自动匹配交易并标记为已对账',
              errorCreating: '创建对账失败',
              errorAutoReconcile: '自动对账失败',
              success: '成功',
              successMessage: '对账创建成功',
              autoReconciliationComplete: '自动对账完成',
              partialReconciliation: '部分对账',
              reconciledTransactions: '成功对账交易 {{count}} 笔',
              manualReviewRequired: '发现差额 {{difference}}。需要手动检查。'
            }
          }
        });
        console.log('Added reconciliation form translations for zh');
      } catch (e) {
        console.error('Error adding reconciliation form translations:', e);
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
      bankAccountId: "",
      statementBalance: "",
      notes: "",
      autoReconcile: false,
    },
  });

  // Update selected account when bank account changes
  const watchBankAccountId = form.watch("bankAccountId");
  useEffect(() => {
    if (watchBankAccountId) {
      const account = accounts.find(a => a.id === watchBankAccountId);
      setSelectedAccount(account || null);
      
      // Pre-fill the book balance in the notes
      if (account) {
        form.setValue("notes", `Book balance: ${account.balance.toFixed(2)}`);
      }
    } else {
      setSelectedAccount(null);
    }
  }, [watchBankAccountId, accounts, form]);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return null;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      
      if (values.autoReconcile) {
        await handleAutoReconcile(values);
      } else {
        await handleManualReconcile(values);
      }
      
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Error creating reconciliation:", error);
      toast({
        title: safeT("common.error", "Error"),
        description: error instanceof Error ? error.message : safeT("finance.reconciliationForm.errorCreating", "Failed to create reconciliation"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }
  
  async function handleManualReconcile(values: z.infer<typeof formSchema>) {
    const response = await fetch("/api/finance/reconciliations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        statementBalance: parseFloat(values.statementBalance),
      }),
    });

    if (!response.ok) {
      throw new Error(safeT("finance.reconciliationForm.errorCreating", "Failed to create reconciliation"));
    }
    
    toast({
      title: safeT("finance.reconciliationForm.success", "Success"),
      description: safeT("finance.reconciliationForm.successMessage", "Reconciliation created successfully"),
    });
  }
  
  async function handleAutoReconcile(values: z.infer<typeof formSchema>) {
    setAutoReconciling(true);
    
    try {
      const response = await fetch("/api/finance/auto-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: values.bankAccountId,
          statementBalance: parseFloat(values.statementBalance),
          date: values.date,
          notes: values.notes,
        }),
      });

      if (!response.ok) {
        throw new Error(safeT("finance.reconciliationForm.errorAutoReconcile", "Failed to auto-reconcile"));
      }
      
      const result = await response.json();
      
      toast({
        title: result.isFullyReconciled 
          ? safeT("finance.reconciliationForm.autoReconciliationComplete", "Auto-Reconciliation Complete") 
          : safeT("finance.reconciliationForm.partialReconciliation", "Partial Reconciliation"),
        description: result.isFullyReconciled 
          ? safeT("finance.reconciliationForm.reconciledTransactions", `Successfully reconciled ${result.transactionsCount} transactions`, { count: result.transactionsCount }) 
          : safeT("finance.reconciliationForm.manualReviewRequired", `Found a difference of ${result.reconciliation.difference}. Manual review required.`, { difference: result.reconciliation.difference }),
        variant: result.isFullyReconciled ? "default" : "warning",
      });
    } finally {
      setAutoReconciling(false);
    }
  }

  return (
    <Tabs defaultValue="manual">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="manual">
          {safeT("finance.reconciliationForm.manualReconciliation", "Manual Reconciliation")}
        </TabsTrigger>
        <TabsTrigger value="auto">
          {safeT("finance.reconciliationForm.autoReconciliation", "Auto Reconciliation")}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="manual">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.date", "Date")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.bankAccount", "Bank Account")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={safeT("finance.reconciliationForm.selectBankAccount", "Select bank account")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} ({account.currency})
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
              name="statementBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.statementBalance", "Statement Balance")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.notes", "Notes")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {safeT("finance.reconciliationForm.creating", "Creating...")}
                </>
              ) : (
                safeT("finance.reconciliationForm.createReconciliation", "Create Reconciliation")
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>
      
      <TabsContent value="auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.date", "Date")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.bankAccount", "Bank Account")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={safeT("finance.reconciliationForm.selectBankAccount", "Select bank account")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} ({account.currency})
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
              name="statementBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.statementBalance", "Statement Balance")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{safeT("finance.reconciliationForm.notes", "Notes")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoReconcile"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {safeT("finance.reconciliationForm.autoReconcileTransactions", "Auto-reconcile transactions")}
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {safeT("finance.reconciliationForm.autoReconcileDescription", "Automatically match transactions and mark them as reconciled")}
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading || autoReconciling}>
              {autoReconciling ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {safeT("finance.reconciliationForm.autoReconciling", "Auto-Reconciling...")}
                </>
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {safeT("finance.reconciliationForm.processing", "Processing...")}
                </>
              ) : (
                safeT("finance.reconciliationForm.autoReconcile", "Auto-Reconcile")
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
} 