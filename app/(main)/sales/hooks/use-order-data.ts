import useSWR from "swr";

interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customer: {
    name: string;
  };
  userId: string;
  user: {
    name: string;
  };
  dividedId: string;
  divided: {
    rollNo: string;
    stock: {
      type: string;
      gsm: number;
    };
  };
  quantity: number;
  price: number;
  tax: number;
  total: number;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useOrderData() {
  const { data, error, isLoading, mutate } = useSWR<Order[]>(
    "/api/sales/order",
    fetcher
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 