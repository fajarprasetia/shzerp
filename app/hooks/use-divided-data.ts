import useSWR from "swr";
import { Divided, Stock } from "@prisma/client";

interface DividedWithStock extends Divided {
  stock: Stock;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDividedData() {
  const { data, error, isLoading, mutate } = useSWR<DividedWithStock[]>(
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