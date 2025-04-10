import useSWR from "swr";
import { Stock, User } from "@prisma/client";

export interface StockWithInspector extends Stock {
  inspectedBy: User | null;
  isSold?: boolean;
  orderNo?: string;
  soldDate?: Date;
  customerName?: string;
}

export function useStockData() {
  const { data, error, isLoading, mutate } = useSWR<StockWithInspector[]>(
    "/api/inventory/stock",
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch stock data");
      }
      return response.json();
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
} 