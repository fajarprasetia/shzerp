"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

interface VendorBill {
  id: string;
  billNo: string;
  vendorId: string;
  vendorName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: string;
}

export function VendorBills() {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/finance/vendor-bills", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setBills(data);
    } catch (err) {
      console.error("Failed to fetch vendor bills:", err);
      setError("Failed to load vendor bills. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load vendor bills. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await fetch("/api/finance/vendor-bills", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Update the local state
      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill.id === id ? { ...bill, status } : bill
        )
      );

      toast({
        title: "Success",
        description: `Bill status updated to ${status}`,
      });
    } catch (err) {
      console.error("Failed to update bill status:", err);
      toast({
        title: "Error",
        description: "Failed to update bill status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Vendor Bills</CardTitle>
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
          <CardTitle>Vendor Bills</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchBills}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Vendor Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No vendor bills found"
            description="Create your first vendor bill to get started."
            icon="receipt"
            action={{
              label: "Create Bill",
              href: "/finance/accounts-payable/create-bill",
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Vendor Bills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg"
            >
              <div className="space-y-1 mb-2 sm:mb-0">
                <div className="font-medium">{bill.billNo}</div>
                <div className="text-sm text-muted-foreground">
                  {bill.vendorName}
                </div>
                <div className="text-sm">
                  Due: {new Date(bill.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="font-medium">
                  {formatCurrency(bill.amount)}
                </div>
                <Badge className={getStatusColor(bill.status)}>
                  {bill.status}
                </Badge>
                {bill.status !== "paid" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate(bill.id, "paid")}
                  >
                    Mark Paid
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 