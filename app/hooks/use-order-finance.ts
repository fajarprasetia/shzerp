import { useCallback } from "react";
import { toast } from "sonner";
import { Transaction } from "@/types/finance";

interface OrderFinanceItem {
  quantity: number;
  unitPrice: number;
  tax: number;
}

interface OrderFinanceResult {
  total: number;
  formattedTotal: string;
}

interface OrderFinanceProps {
  orderId: string;
  customerId: string;
  amount: number;
  description: string;
  date: Date;
}

export function useOrderFinance({ items }: { items: OrderFinanceItem[] }): OrderFinanceResult {
  const createOrderTransaction = useCallback(async ({
    orderId,
    customerId,
    amount,
    description,
    date,
  }: OrderFinanceProps) => {
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "income",
          amount,
          description,
          category: "sales",
          date,
          tags: ["order", orderId, customerId],
          notes: `Order ID: ${orderId}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transaction");
      }

      const data = await response.json();
      toast.success("Transaction recorded successfully");
      return data;
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to record transaction");
      throw error;
    }
  }, []);

  const updateOrderTransaction = useCallback(async ({
    orderId,
    customerId,
    amount,
    description,
    date,
  }: OrderFinanceProps) => {
    try {
      // First, find the existing transaction
      const searchResponse = await fetch(`/api/finance/transactions/search?tag=${orderId}`);
      if (!searchResponse.ok) {
        throw new Error("Failed to find existing transaction");
      }

      const { transactions } = await searchResponse.json();
      const existingTransaction = transactions[0];

      if (!existingTransaction) {
        return createOrderTransaction({
          orderId,
          customerId,
          amount,
          description,
          date,
        });
      }

      // Update the existing transaction
      const response = await fetch(`/api/finance/transactions/${existingTransaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description,
          date,
          tags: ["order", orderId, customerId],
          notes: `Order ID: ${orderId} (Updated)`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update transaction");
      }

      const data = await response.json();
      toast.success("Transaction updated successfully");
      return data;
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
      throw error;
    }
  }, [createOrderTransaction]);

  const deleteOrderTransaction = useCallback(async (orderId: string) => {
    try {
      // First, find the existing transaction
      const searchResponse = await fetch(`/api/finance/transactions/search?tag=${orderId}`);
      if (!searchResponse.ok) {
        throw new Error("Failed to find existing transaction");
      }

      const { transactions } = await searchResponse.json();
      const existingTransaction = transactions[0];

      if (!existingTransaction) {
        return;
      }

      // Delete the transaction
      const response = await fetch(`/api/finance/transactions/${existingTransaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete transaction");
      }

      toast.success("Transaction deleted successfully");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
      throw error;
    }
  }, []);

  return {
    createOrderTransaction,
    updateOrderTransaction,
    deleteOrderTransaction,
  };
} 