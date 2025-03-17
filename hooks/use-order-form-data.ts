import useSWR from "swr";
import { Customer, Stock, Divided } from "@prisma/client";

interface OrderFormData {
  customers: Customer[];
  stocks: Stock[];
  dividedStocks: (Divided & { gsm: number })[];
}

export function useOrderFormData() {
  const { data, error, isLoading } = useSWR<OrderFormData>(
    "/api/sales/orders/form-data",
    async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch form data");
        }
        const data = await response.json();
        console.log('Raw API response:', data);
        if (!data.customers || !Array.isArray(data.customers)) {
          throw new Error("Invalid customers data");
        }
        return data;
      } catch (error) {
        console.error("Error fetching form data:", error);
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 5000,
    }
  );

  if (error) {
    console.error("Error in useOrderFormData:", error);
  }

  return {
    customers: data?.customers ?? [],
    stocks: data?.stocks ?? [],
    dividedStocks: data?.dividedStocks ?? [],
    isLoading,
    error,
  };
} 