"use client";

import { useRouter } from "next/navigation";
import { OrderForm } from "../components/order-form";
import { useToast } from "@/components/ui/use-toast";

export default function NewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "Order created successfully"
    });
    router.push("/sales/orders");
  };
  
  const handleCancel = () => {
    router.push("/sales/orders");
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Order</h1>
      <OrderForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
} 