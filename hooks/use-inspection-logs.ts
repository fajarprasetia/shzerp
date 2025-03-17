import useSWR from "swr";
import { Stock, Divided, User } from "@prisma/client";

export interface InspectionLog {
  id: string;
  itemId: string;
  itemType: "STOCK" | "DIVIDED";
  inspectedById: string;
  inspectedAt: Date;
  note: string;
  inspectedBy: User;
  stock?: Stock;
  divided?: Divided;
}

export function useInspectionLogs() {
  const { data, error, isLoading, mutate } = useSWR<InspectionLog[]>(
    "/api/inventory/inspection/logs",
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch inspection logs");
      }
      return response.json();
    }
  );

  return {
    logs: data || [],
    isLoading,
    error,
    mutate,
  };
} 