"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// We'll define the schema dynamically after we have the translation function
let formSchema: z.ZodType<any>;

interface VendorBillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function VendorBillForm({ onSuccess, onCancel }: VendorBillFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  // Define the schema with translated messages
  useEffect(() => {
    formSchema = z.object({
      vendorId: z.string().min(1, t('finance.vendorBill.validation.vendorRequired', "Vendor is required")),
      amount: z.number().min(0.01, t('finance.vendorBill.validation.amountGreaterThanZero', "Amount must be greater than 0")),
      billDate: z.date({
        required_error: t('finance.vendorBill.validation.billDateRequired', "Bill date is required"),
      }),
      dueDate: z.date(),
      description: z.string().min(1, t('finance.vendorBill.validation.descriptionRequired', "Description is required")),
      category: z.string().min(1, t('finance.vendorBill.validation.categoryRequired', "Category is required")),
      status: z.enum(["draft", "pending", "paid"]),
      notes: z.string().optional(),
    });
    
    setMounted(true);
  }, [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "pending",
      billDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default due date to 30 days from today
      notes: "",
    },
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch("/api/vendors");
        if (!response.ok) throw new Error(t('finance.vendors.fetchError', "Failed to fetch vendors"));
        const data = await response.json();
        setVendors(data);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
    };

    if (mounted) {
      fetchVendors();
    }
  }, [mounted, t]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      const response = await fetch("/api/finance/vendor-bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error(t('finance.vendorBill.createError', "Failed to create vendor bill"));

      onSuccess();
    } catch (error) {
      console.error("Error creating vendor bill:", error);
      setLoading(false);
    }
  }

  const handleCreateVendor = () => {
    router.push("/finance/accounts-payable/vendors/create");
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.vendorBill.vendor', 'Vendor')}</FormLabel>
                <div className="flex space-x-2">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('finance.vendorBill.selectVendor', 'Select vendor')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleCreateVendor}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.vendorBill.amount', 'Amount (IDR)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
            name="billDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('finance.vendorBill.billDate', 'Bill Date')}</FormLabel>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      // Toggle calendar visibility
                    }}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>{t('finance.vendorBill.pickDate', 'Pick a date')}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
                <FormMessage />
                {/* Calendar dropdown would go here */}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('finance.vendorBill.dueDate', 'Due Date')}</FormLabel>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      // Toggle calendar visibility
                    }}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>{t('finance.vendorBill.pickDate', 'Pick a date')}</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
                <FormMessage />
                {/* Calendar dropdown would go here */}
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.vendorBill.description', 'Description')}</FormLabel>
              <FormControl>
                <Input placeholder={t('finance.vendorBill.descriptionPlaceholder', 'Enter bill description')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.vendorBill.category', 'Category')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('finance.vendorBill.selectCategory', 'Select category')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="materials">{t('finance.vendorBill.categories.materials', 'Materials')}</SelectItem>
                    <SelectItem value="services">{t('finance.vendorBill.categories.services', 'Services')}</SelectItem>
                    <SelectItem value="equipment">{t('finance.vendorBill.categories.equipment', 'Equipment')}</SelectItem>
                    <SelectItem value="utilities">{t('finance.vendorBill.categories.utilities', 'Utilities')}</SelectItem>
                    <SelectItem value="rent">{t('finance.vendorBill.categories.rent', 'Rent')}</SelectItem>
                    <SelectItem value="other">{t('finance.vendorBill.categories.other', 'Other')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.vendorBill.status', 'Status')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('finance.vendorBill.selectStatus', 'Select status')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">{t('finance.vendorBill.statuses.draft', 'Draft')}</SelectItem>
                    <SelectItem value="pending">{t('finance.vendorBill.statuses.pending', 'Pending')}</SelectItem>
                    <SelectItem value="paid">{t('finance.vendorBill.statuses.paid', 'Paid')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.vendorBill.notes', 'Notes')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('finance.vendorBill.notesPlaceholder', 'Additional notes (optional)')} className="min-h-[80px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('common.saving', 'Saving...') : t('finance.vendorBill.saveBill', 'Save Bill')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 