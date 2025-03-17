import useSWR from "swr";
import { Stock, Divided } from "@prisma/client";

interface StockWithInspector extends Stock {
  inspectedBy?: {
    name: string;
  };
}

interface DividedWithDetails extends Divided {
  stock: {
    jumboRollNo: string;
    type: string;
    gsm: number;
  };
  inspectedBy?: {
    name: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUninspectedData() {
  const { data: stockData, error: stockError, mutate: mutateStock } = useSWR<StockWithInspector[]>(
    "/api/inventory/stock/uninspected",
    fetcher
  );

  const { data: dividedData, error: dividedError, mutate: mutateDivided } = useSWR<DividedWithDetails[]>(
    "/api/inventory/divided/uninspected",
    fetcher
  );

  const data = [
    ...(stockData || []),
    ...(dividedData || []),
  ];

  const mutate = () => {
    mutateStock();
    mutateDivided();
  };

  return {
    data,
    isLoading: !stockData || !dividedData,
    isError: stockError || dividedError,
    mutate,
  };
} 