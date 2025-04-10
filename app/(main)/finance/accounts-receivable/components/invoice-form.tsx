"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";

interface Customer {
  id: string;
  name: string;
}

export function InvoiceForm() {
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const fetchCustomers = async () => {
      try {
        const response = await fetch("/api/customers");
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error(t('finance.accountsReceivable.invoice.errorFetchingCustomers', 'Error fetching customers'));
      }
    };

    if (mounted) {
      fetchCustomers();
    }
  }, [t, mounted]);

  const formSchema = z.object({
    customerId: z.string().min(1, {
      message: t('finance.accountsReceivable.invoice.validation.customerRequired', 'Please select a customer'),
    }),
    invoiceNumber: z.string().min(1, {
      message: t('finance.accountsReceivable.invoice.validation.invoiceNumberRequired', 'Invoice number is required'),
    }),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: t('finance.accountsReceivable.invoice.validation.validAmount', 'Please enter a valid amount'),
    }),
    invoiceDate: z.date({
      required_error: t('finance.accountsReceivable.invoice.validation.invoiceDateRequired', 'Invoice date is required'),
    }),
    dueDate: z.date({
      required_error: t('finance.accountsReceivable.invoice.validation.dueDateRequired', 'Due date is required'),
    }),
    description: z.string().optional(),
    paymentTerms: z.string().min(1, {
      message: t('finance.accountsReceivable.invoice.validation.paymentTermsRequired', 'Payment terms are required'),
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      invoiceNumber: "",
      amount: "",
      description: "",
      paymentTerms: "30",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(t('finance.accountsReceivable.invoice.errorCreating', 'Error creating invoice'));
      }

      toast.success(t('finance.accountsReceivable.invoice.createSuccess', 'Invoice created successfully'));
      router.push("/finance/accounts-receivable");
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : t('finance.accountsReceivable.invoice.genericError', 'An error occurred while creating the invoice')
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.accountsReceivable.invoice.customer', 'Customer')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance.accountsReceivable.invoice.selectCustomer', 'Select a customer')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.accountsReceivable.invoice.invoiceNumber', 'Invoice Number')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('finance.accountsReceivable.invoice.enterInvoiceNumber', 'Enter invoice number')}
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.accountsReceivable.invoice.amount', 'Amount (IDR)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoiceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('finance.accountsReceivable.invoice.invoiceDate', 'Invoice Date')}</FormLabel>
                <DatePicker
                  disabled={isLoading}
                  selected={field.value}
                  onSelect={field.onChange}
                  mode="single"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('finance.accountsReceivable.invoice.dueDate', 'Due Date')}</FormLabel>
                <DatePicker
                  disabled={isLoading}
                  selected={field.value}
                  onSelect={field.onChange}
                  mode="single"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="paymentTerms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.accountsReceivable.invoice.paymentTerms', 'Payment Terms')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('finance.accountsReceivable.invoice.selectPaymentTerms', 'Select payment terms')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="7">{t('finance.accountsReceivable.invoice.net7', 'Net 7')}</SelectItem>
                  <SelectItem value="14">{t('finance.accountsReceivable.invoice.net14', 'Net 14')}</SelectItem>
                  <SelectItem value="30">{t('finance.accountsReceivable.invoice.net30', 'Net 30')}</SelectItem>
                  <SelectItem value="60">{t('finance.accountsReceivable.invoice.net60', 'Net 60')}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {t('finance.accountsReceivable.invoice.paymentTermsDescription', 'Number of days the customer has to pay the invoice')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.accountsReceivable.invoice.description', 'Description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('finance.accountsReceivable.invoice.enterDescription', 'Enter invoice description')}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                {t('finance.accountsReceivable.invoice.descriptionHelp', 'Additional details about this invoice')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <LoadingButton type="submit" loading={isLoading}>
            {t('finance.accountsReceivable.invoice.createInvoice', 'Create Invoice')}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
} 