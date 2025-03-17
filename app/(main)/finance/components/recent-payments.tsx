"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  notes?: string;
  invoiceNo?: string;
  customerName?: string;
  recordedBy?: string;
  formattedDate?: string;
  order?: {
    orderNo: string;
    customer: {
      name: string;
    };
  };
}

export function RecentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentPayments = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/finance/payments?limit=5");
        if (!response.ok) {
          throw new Error("Failed to fetch recent payments");
        }
        const data = await response.json();
        setPayments(data);
      } catch (error) {
        console.error("Error fetching recent payments:", error);
        toast.error("Failed to load recent payments");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPayments();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No recent payments found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <div key={payment.id} className="flex items-start justify-between border-b pb-3">
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {payment.order?.customer?.name || payment.customerName || "Customer Payment"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(payment.paymentDate)}
              </p>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {payment.paymentMethod}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-green-600">
              {formatCurrency(payment.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {payment.order?.orderNo || payment.invoiceNo || "No reference"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 