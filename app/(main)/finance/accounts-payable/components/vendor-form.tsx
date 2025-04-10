"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

// We'll define the schema dynamically after we have the translation function
let formSchema: z.ZodType<any>;

interface Vendor {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
}

interface VendorFormProps {
  vendor?: Vendor;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VendorForm({ vendor, onSuccess, onCancel }: VendorFormProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const isEditing = !!vendor?.id;

  // Define the schema with translated messages
  useEffect(() => {
    formSchema = z.object({
      name: z.string().min(1, t('finance.vendor.validation.nameRequired', "Vendor name is required")),
      email: z.string().email(t('finance.vendor.validation.emailInvalid', "Invalid email address")).optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      taxId: z.string().optional(),
      notes: z.string().optional(),
    });
    
    setMounted(true);
  }, [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: vendor?.name || "",
      email: vendor?.email || "",
      phone: vendor?.phone || "",
      address: vendor?.address || "",
      taxId: vendor?.taxId || "",
      notes: vendor?.notes || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      
      const endpoint = "/api/vendors";
      const method = isEditing ? "PATCH" : "POST";
      const body = isEditing 
        ? { id: vendor.id, ...values, isActive: vendor.isActive } 
        : values;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('finance.vendor.saveError', "Failed to save vendor"));
      }

      toast.success(isEditing ? t('finance.vendor.updatedSuccess', "Vendor updated") : t('finance.vendor.createdSuccess', "Vendor created"));
      onSuccess();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error(error instanceof Error ? error.message : t('common.genericError', "An error occurred"));
    } finally {
      setLoading(false);
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.vendor.name', 'Vendor Name')}*</FormLabel>
              <FormControl>
                <Input placeholder={t('finance.vendor.namePlaceholder', 'Enter vendor name')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.vendor.email', 'Email')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('finance.vendor.emailPlaceholder', 'vendor@example.com')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('finance.vendor.phone', 'Phone')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('finance.vendor.phonePlaceholder', 'Phone number')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.vendor.address', 'Address')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('finance.vendor.addressPlaceholder', 'Vendor address')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="taxId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('finance.vendor.taxId', 'Tax ID')}</FormLabel>
              <FormControl>
                <Input placeholder={t('finance.vendor.taxIdPlaceholder', 'Tax identification number')} {...field} />
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
              <FormLabel>{t('finance.vendor.notes', 'Notes')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('finance.vendor.notesPlaceholder', 'Additional notes')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('common.saving', 'Saving...') : isEditing ? t('finance.vendor.updateVendor', 'Update Vendor') : t('finance.vendor.createVendor', 'Create Vendor')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 