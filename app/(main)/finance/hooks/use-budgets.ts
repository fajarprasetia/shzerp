import useSWR from "swr";
import { Budget } from "@/types/finance";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBudgets() {
  const { data, error, mutate } = useSWR<Budget[]>(
    "/api/finance/budgets",
    fetcher
  );

  return {
    budgets: data ?? [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
} 