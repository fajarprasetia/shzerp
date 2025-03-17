import useSWR from "swr";
import { Order } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useOrderData() {
  const { data, error, isLoading, mutate } = useSWR<Order[]>(
    "/api/orders",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
} 