import useSWR from "swr";
import { Account } from "@/types/finance";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAccounts() {
  const { data, error, mutate } = useSWR<Account[]>(
    "/api/finance/accounts",
    fetcher
  );

  return {
    accounts: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
} 