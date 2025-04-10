import useSWR from "swr";
import { Divided } from "@prisma/client";

// Extend Divided type to include sold information
export interface DividedWithSoldInfo extends Divided {
  isSold?: boolean;
  orderNo?: string;
  soldDate?: Date;
  customerName?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDividedData() {
  const { data, error, isLoading, mutate } = useSWR<DividedWithSoldInfo[]>(
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