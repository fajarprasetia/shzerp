import useSWR from "swr";
import { Divided } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDividedData() {
  const { data, error, isLoading, mutate } = useSWR<Divided[]>(
    "/api/inventory/divided",
    fetcher
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 