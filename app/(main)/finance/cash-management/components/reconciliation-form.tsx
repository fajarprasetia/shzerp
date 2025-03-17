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
  const { toast } = useToast();

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
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create reconciliation",
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
      throw new Error("Failed to create reconciliation");
    }
    
    toast({
      title: "Success",
      description: "Reconciliation created successfully",
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
        throw new Error("Failed to auto-reconcile");
      }
      
      const result = await response.json();
      
      toast({
        title: result.isFullyReconciled ? "Auto-Reconciliation Complete" : "Partial Reconciliation",
        description: result.isFullyReconciled 
          ? `Successfully reconciled ${result.transactionsCount} transactions` 
          : `Found a difference of ${result.reconciliation.difference}. Manual review required.`,
        variant: result.isFullyReconciled ? "default" : "warning",
      });
    } finally {
      setAutoReconciling(false);
    }
  }

  return (
    <Tabs defaultValue="manual">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="manual">Manual Reconciliation</TabsTrigger>
        <TabsTrigger value="auto">Auto Reconciliation</TabsTrigger>
      </TabsList>
      
      <TabsContent value="manual">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
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
                  <FormLabel>Bank Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
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
                  <FormLabel>Statement Balance</FormLabel>
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
                  <FormLabel>Notes</FormLabel>
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
                  Creating...
                </>
              ) : (
                "Create Reconciliation"
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
                  <FormLabel>Date</FormLabel>
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
                  <FormLabel>Bank Account</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
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
                  <FormLabel>Statement Balance</FormLabel>
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
                  <FormLabel>Notes</FormLabel>
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
                      Auto-reconcile transactions
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically match transactions and mark them as reconciled
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading || autoReconciling}>
              {autoReconciling ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Auto-Reconciling...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Auto-Reconcile"
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
} 