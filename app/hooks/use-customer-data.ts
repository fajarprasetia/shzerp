import useSWR from "swr";
import { Customer } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCustomerData() {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>(
    "/api/sales/customer",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
} 