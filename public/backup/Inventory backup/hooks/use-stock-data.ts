import useSWR from "swr";
import { Stock } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStockData() {
  const { data, error, isLoading, mutate } = useSWR<Stock[]>(
    "/api/inventory/stock",
    fetcher
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 