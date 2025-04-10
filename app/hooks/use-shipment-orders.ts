import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('Failed to fetch orders');
    console.error('API Error:', await res.text());
    throw error;
  }
  return res.json();
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface OrderItem {
  id: string;
  type: string;
  product?: string;
  gsm?: string;
  width?: string;
  length?: string;
  weight?: string;
  quantity: number;
  price: number;
  barcode?: string;
  sku?: string;
  stockId?: string;
  dividedId?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customer: Customer;
  orderItems: OrderItem[];
  note?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  orders: Order[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

interface OrdersQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useOrders(params: OrdersQueryParams = {}) {
  const { page = 1, pageSize = 10, search = '' } = params;
  
  const queryString = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(search ? { search } : {})
  }).toString();
  
  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    `/api/shipment/orders?${queryString}`, 
    fetcher
  );
  
  // Log error if any
  if (error) {
    console.error('Orders fetch error:', error);
  }
  
  return {
    data,
    error,
    isLoading,
    mutate
  };
}

export function useOrderById(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{ order: Order }>(
    id ? `/api/shipment/orders/${id}` : null, 
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );
  
  // Log error if any
  if (error) {
    console.error(`Order ${id} fetch error:`, error);
  }
  
  return {
    order: data?.order,
    error,
    isLoading,
    mutate
  };
} 