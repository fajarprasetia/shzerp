"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentForm } from "../components/payment-form";
import { withPermission } from "@/app/components/with-permission";
import { ArrowLeft } from "lucide-react";

export default withPermission(NewPaymentPage, "finance", "create");

function NewPaymentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    router.back();
  };

  const handleSuccess = () => {
    router.push("/finance?tab=payments");
  };

  return (
    <div className="container mx-auto py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={handleCancel}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Finance
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Record New Payment</CardTitle>
          <CardDescription>
            Record a new payment in Indonesian Rupiah (IDR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
} 