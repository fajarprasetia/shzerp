"use client";

import useSWR from "swr";
import { Stock, Divided } from "@prisma/client";

interface UninspectedData {
  stock: Stock[];
  divided: Divided[];
}

export function useInspectionData() {
  const { 
    data: uninspectedData, 
    error: uninspectedError, 
    mutate: mutateUninspected,
    isLoading: isLoadingUninspected 
  } = useSWR<UninspectedData>(
    "/api/inventory/inspection/uninspected",
    {
      onError: (err) => {
        console.error("Error fetching uninspected data:", err);
      }
    }
  );

  const { 
    data: logs, 
    error: logsError,
    isLoading: isLoadingLogs 
  } = useSWR(
    "/api/inventory/inspection/logs",
    {
      onError: (err) => {
        console.error("Error fetching inspection logs:", err);
      }
    }
  );

  const isLoading = isLoadingUninspected || isLoadingLogs;
  const isError = uninspectedError || logsError;

  if (uninspectedError) {
    console.error("Uninspected data error:", uninspectedError);
  }

  if (logsError) {
    console.error("Logs error:", logsError);
  }

  return {
    uninspectedStock: uninspectedData?.stock || [],
    uninspectedDivided: uninspectedData?.divided || [],
    logs: logs || [],
    isLoading,
    isError,
    mutate: mutateUninspected
  };
} 