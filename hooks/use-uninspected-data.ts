import useSWR from "swr";
import { Stock, Divided, User } from "@prisma/client";

export interface UninspectedItem extends Stock {
  inspectedBy: User | null;
}

export interface UninspectedDivided extends Divided {
  inspectedBy: User | null;
  stock: Stock;
}

export interface UninspectedData {
  stocks: UninspectedItem[];
  divided: UninspectedDivided[];
}

export function useUninspectedData() {
  const { data, error, isLoading, mutate } = useSWR<UninspectedData>(
    "/api/inventory/inspection/uninspected",
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch uninspected items");
      }
      return response.json();
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
  };
} 