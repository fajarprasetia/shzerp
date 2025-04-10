"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorForm } from "../../components/vendor-form";
import { withPermission } from "@/lib/with-permission";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

function CreateVendorPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnToForm, setReturnToForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  useEffect(() => {
    // Check if we should return to the vendor bill form after creating a vendor
    const formData = sessionStorage.getItem('vendorBillFormData');
    if (formData) {
      setReturnToForm(true);
    }
    setMounted(true);
  }, []);

  const handleCancel = () => {
    if (returnToForm) {
      router.push("/finance/accounts-payable/create-bill");
    } else {
      router.back();
    }
  };

  const handleSuccess = () => {
    setIsSubmitting(true);
    
    if (returnToForm) {
      // Clear the stored form data
      sessionStorage.removeItem('vendorBillFormData');
      // Return to the vendor bill form
      router.push("/finance/accounts-payable/create-bill");
    } else {
      router.push("/finance/accounts-payable/vendors");
    }
    
    router.refresh();
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          className="mr-4"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <h1 className="text-2xl font-bold">{t('finance.vendor.createNew', 'Create New Vendor')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance.vendor.information', 'Vendor Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default withPermission(CreateVendorPage, "finance.vendors.create"); 