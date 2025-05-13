"use client";

import { useRouter } from "next/navigation";
import { OrderForm } from "../components/order-form";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

export default function NewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      console.log("Submitting order data:", JSON.stringify(data, null, 2));
      
      // Ensure totalAmount is a number and not zero
      if (typeof data.totalAmount !== 'number' || isNaN(data.totalAmount) || data.totalAmount <= 0) {
        console.error("Invalid total amount:", data.totalAmount, "type:", typeof data.totalAmount);
        throw new Error("Order total amount must be a positive number");
      }

      // Force convert to number to ensure proper type
      const submissionData = {
        ...data,
        totalAmount: Number(data.totalAmount),
        discount: Number(data.discount || 0),
      };
      
      console.log("Final submission data:", JSON.stringify(submissionData, null, 2));
      console.log("totalAmount:", submissionData.totalAmount, "type:", typeof submissionData.totalAmount);
      
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();
      console.log("Order created successfully:", result);
      
      toast({
        title: "Success",
        description: `Order ${result.orderNo} created successfully`
      });
      
      router.push("/sales/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    router.push("/sales/orders");
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Order</h1>
      <OrderForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={undefined}
      />
    </div>
  );
} 