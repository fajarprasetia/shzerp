import useSWR from "swr";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  company: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCustomerData() {
  const { data, error, isLoading, mutate } = useSWR<Customer[]>(
    "/api/sales/customer",
    fetcher
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 