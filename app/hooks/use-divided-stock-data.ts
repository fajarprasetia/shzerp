import useSWR from "swr";
import { Stock } from "@prisma/client";

interface DividedStock {
  id: string;
  barcodeId: string;
  parentStockId: string;
  length: number;
  note?: string;
  inspected: boolean;
  inspectedById?: string;
  inspectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  parentStock: Stock;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDividedStockData() {
  const { data, error, isLoading, mutate } = useSWR<DividedStock[]>(
    "/api/inventory/divided",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
} 