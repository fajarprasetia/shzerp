"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JournalEntry, JournalEntryItem, Account } from "@prisma/client";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.journalEntryForm.date': '日期',
  'finance.journalEntryForm.pickDate': '选择日期',
  'finance.journalEntryForm.reference': '参考编号',
  'finance.journalEntryForm.referencePlace': '输入参考编号',
  'finance.journalEntryForm.description': '描述',
  'finance.journalEntryForm.descriptionPlace': '输入会计分录描述',
  'finance.journalEntryForm.items': '分录项目',
  'finance.journalEntryForm.addLine': '添加行',
  'finance.journalEntryForm.selectAccount': '选择账户',
  'finance.journalEntryForm.itemDescription': '描述',
  'finance.journalEntryForm.debit': '借方',
  'finance.journalEntryForm.credit': '贷方',
  'finance.journalEntryForm.totalDebits': '借方总额',
  'finance.journalEntryForm.totalCredits': '贷方总额',
  'finance.journalEntryForm.difference': '差额',
  'finance.journalEntryForm.cancel': '取消',
  'finance.journalEntryForm.create': '创建会计分录',
  'finance.journalEntryForm.update': '更新会计分录',
  'finance.journalEntryForm.creating': '创建中...',
  'finance.journalEntryForm.updating': '更新中...',
  'finance.journalEntryForm.validation.descRequired': '描述是必填项',
  'finance.journalEntryForm.validation.accountRequired': '账户是必填项',
  'finance.journalEntryForm.validation.itemRequired': '至少需要一个分录项目',
  'finance.journalEntryForm.validation.balanceError': '借方总额必须等于贷方总额',
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
    
    console.log(`Forced journal entry form translation for ${key}: ${translation}`);
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

// Define the form schema type
type FormSchema = z.infer<typeof formSchema>;

// Define the form schema before using it
const createFormSchema = (safeT: (key: string, defaultValue: string) => string) => z.object({
  date: z.date(),
  description: z.string().min(1, safeT('finance.journalEntryForm.validation.descRequired', "Description is required")),
  reference: z.string().optional(),
  items: z.array(z.object({
    accountId: z.string().min(1, safeT('finance.journalEntryForm.validation.accountRequired', "Account is required")),
    description: z.string().optional(),
    debit: z.number().min(0),
    credit: z.number().min(0),
  })).min(1, safeT('finance.journalEntryForm.validation.itemRequired', "At least one item is required"))
    .refine((items) => {
      const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    }, safeT('finance.journalEntryForm.validation.balanceError', "Total debits must equal total credits")),
});

interface JournalEntryFormProps {
  initialData?: (JournalEntry & { items?: JournalEntryItem[] }) | null;
  onSubmit: (data: FormSchema) => void;
  onCancel: () => void;
}

export function JournalEntryForm({ initialData, onSubmit, onCancel }: JournalEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
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
      console.log('Ensuring Chinese translations for Journal Entry Form Component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            journalEntryForm: {
              date: '日期',
              pickDate: '选择日期',
              reference: '参考编号',
              referencePlace: '输入参考编号',
              description: '描述',
              descriptionPlace: '输入会计分录描述',
              items: '分录项目',
              addLine: '添加行',
              selectAccount: '选择账户',
              itemDescription: '描述',
              debit: '借方',
              credit: '贷方',
              totalDebits: '借方总额',
              totalCredits: '贷方总额',
              difference: '差额',
              cancel: '取消',
              create: '创建会计分录',
              update: '更新会计分录',
              creating: '创建中...',
              updating: '更新中...',
              validation: {
                descRequired: '描述是必填项',
                accountRequired: '账户是必填项',
                itemRequired: '至少需要一个分录项目',
                balanceError: '借方总额必须等于贷方总额'
              }
            }
          }
        });
        console.log('Added journal entry form translations for zh');
      } catch (e) {
        console.error('Error adding journal entry form translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  // Create form schema with translations
  const formSchema = createFormSchema(safeT);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      description: initialData?.description || "",
      reference: initialData?.reference || "",
      items: initialData?.items?.map(item => ({
        accountId: item.accountId,
        description: item.description || "",
        debit: item.debit || 0,
        credit: item.credit || 0
      })) || [{ accountId: "", description: "", debit: 0, credit: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/finance/accounts");
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
  }, []);

  const handleSubmit = async (data: FormSchema) => {
    try {
      setLoading(true);
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const totalDebits = form.watch("items").reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredits = form.watch("items").reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{safeT('finance.journalEntryForm.date', 'Date')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{safeT('finance.journalEntryForm.pickDate', 'Pick a date')}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{safeT('finance.journalEntryForm.reference', 'Reference')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={safeT('finance.journalEntryForm.referencePlace', 'Enter reference number')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{safeT('finance.journalEntryForm.description', 'Description')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={safeT('finance.journalEntryForm.descriptionPlace', 'Enter journal entry description')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{safeT('finance.journalEntryForm.items', 'Journal Entry Items')}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ accountId: "", description: "", debit: 0, credit: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              {safeT('finance.journalEntryForm.addLine', 'Add Line')}
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.accountId`}
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={safeT('finance.journalEntryForm.selectAccount', 'Select account')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder={safeT('finance.journalEntryForm.itemDescription', 'Description')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.debit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder={safeT('finance.journalEntryForm.debit', 'Debit')}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? Number(value) : 0);
                            // Clear credit if debit is entered
                            if (value && Number(value) > 0) {
                              form.setValue(`items.${index}.credit`, 0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.credit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder={safeT('finance.journalEntryForm.credit', 'Credit')}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? Number(value) : 0);
                            // Clear debit if credit is entered
                            if (value && Number(value) > 0) {
                              form.setValue(`items.${index}.debit`, 0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-4 text-sm">
            <div>{safeT('finance.journalEntryForm.totalDebits', 'Total Debits')}: {totalDebits.toFixed(2)}</div>
            <div>{safeT('finance.journalEntryForm.totalCredits', 'Total Credits')}: {totalCredits.toFixed(2)}</div>
            <div>{safeT('finance.journalEntryForm.difference', 'Difference')}: {Math.abs(totalDebits - totalCredits).toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {safeT('finance.journalEntryForm.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                {initialData 
                  ? safeT('finance.journalEntryForm.updating', 'Updating...') 
                  : safeT('finance.journalEntryForm.creating', 'Creating...')}
              </>
            ) : (
              <>{initialData 
                ? safeT('finance.journalEntryForm.update', 'Update') 
                : safeT('finance.journalEntryForm.create', 'Create')} {safeT('finance.journalEntries.title', 'Journal Entry')}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 