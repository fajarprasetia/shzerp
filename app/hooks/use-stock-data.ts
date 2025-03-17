import useSWR from "swr";
import { Stock } from "@prisma/client";

export interface StockWithInspector extends Stock {
  inspector: {
    name: string;
  } | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch stock data");
  }
  return res.json();
};

export function useStockData() {
  const { data, error, isLoading, mutate } = useSWR<StockWithInspector[]>(
    "/api/inventory/stock",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
} 