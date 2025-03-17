import useSWR from "swr";

export function useOrders() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/sales/orders",
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
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