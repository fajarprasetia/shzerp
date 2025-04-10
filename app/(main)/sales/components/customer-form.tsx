"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface CustomerFormProps {
  initialData?: {
    id?: string;
    name: string;
    email?: string | null;
    phone: string;
    whatsapp?: string | null;
    company?: string | null;
    address?: string | null;
  } | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ initialData, onSubmit, onCancel }: CustomerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    whatsapp: initialData?.whatsapp || "",
    company: initialData?.company || "",
    address: initialData?.address || "",
  });
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Format phone or WhatsApp numbers by replacing leading 0 with 62
    if ((name === 'phone' || name === 'whatsapp') && value.startsWith('0')) {
      const formattedValue = `62${value.substring(1)}`;
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Format phone number if it starts with 0
      let dataToSubmit = {...formData};
      
      // Format phone and WhatsApp numbers if they start with 0
      if (dataToSubmit.phone.startsWith('0')) {
        dataToSubmit.phone = `62${dataToSubmit.phone.substring(1)}`;
      }
      
      if (dataToSubmit.whatsapp && dataToSubmit.whatsapp.startsWith('0')) {
        dataToSubmit.whatsapp = `62${dataToSubmit.whatsapp.substring(1)}`;
      }
      
      // Add the ID if we're editing a customer
      if (initialData?.id) {
        dataToSubmit.id = initialData.id;
      }
      
      // Call the onSubmit function passed from the parent component
      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error(t('sales.customers.errorSaving', 'Failed to save customer'));
    } finally {
      setIsLoading(false);
    }
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div>{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('sales.customers.name', 'Name')} *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">{t('sales.customers.company', 'Company')}</Label>
        <Input
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('sales.customers.phone', 'Phone')} *</Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder={t('sales.customers.placeholder.phone', 'e.g. 628123456789')}
            required
          />
          <p className="text-xs text-muted-foreground">
            {t('sales.customers.phoneHint', 'Leading 0 will be replaced with country code 62')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">{t('sales.customers.whatsapp', 'WhatsApp')}</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleChange}
            placeholder={t('sales.customers.placeholder.whatsapp', 'e.g. 628123456789')}
          />
          <p className="text-xs text-muted-foreground">
            {t('sales.customers.phoneHint', 'Leading 0 will be replaced with country code 62')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('sales.customers.email', 'Email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t('sales.customers.address', 'Address')}</Label>
        <Textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('common.saving', 'Saving...') : initialData ? t('common.update', 'Update') : t('common.create', 'Create')}
        </Button>
      </div>
    </form>
  );
} 