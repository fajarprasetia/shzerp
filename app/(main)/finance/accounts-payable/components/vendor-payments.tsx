"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

interface VendorPayment {
  id: string;
  billId: string;
  billNo: string;
  vendorName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  reference?: string;
}

export function VendorPayments() {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/finance/vendor-payments", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setPayments(data);
    } catch (err) {
      console.error("Failed to fetch vendor payments:", err);
      setError("Failed to load vendor payments. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load vendor payments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchPayments}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No payments found"
            description="Record your first payment to get started."
            icon="credit-card"
            action={{
              label: "Record Payment",
              href: "/finance/accounts-payable/record-payment",
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg"
            >
              <div className="space-y-1 mb-2 sm:mb-0">
                <div className="font-medium">
                  Payment for Bill #{payment.billNo}
                </div>
                <div className="text-sm text-muted-foreground">
                  {payment.vendorName}
                </div>
                <div className="text-sm">
                  Date: {new Date(payment.paymentDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="font-medium">
                  {formatCurrency(payment.amount)}
                </div>
                <Badge
                  className={
                    payment.status === "completed"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }
                >
                  {payment.status}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {payment.paymentMethod}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 