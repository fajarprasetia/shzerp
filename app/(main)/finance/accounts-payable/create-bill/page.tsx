"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorBillForm } from "../components/vendor-bill-form";
import { withPermission } from "@/app/components/with-permission";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

export default withPermission(CreateBillPage, "finance", "create");

function CreateBillPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCancel = () => {
    router.back();
  };

  const handleSuccess = () => {
    router.push("/finance/accounts-payable?tab=bills");
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-8">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={handleCancel}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('finance.accountsPayable.backToAccountsPayable', 'Back to Accounts Payable')}
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('finance.accountsPayable.createNewVendorBill', 'Create New Vendor Bill')}</CardTitle>
          <CardDescription>
            {t('finance.accountsPayable.recordNewVendorBill', 'Record a new vendor bill in Indonesian Rupiah (IDR)')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VendorBillForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
} 