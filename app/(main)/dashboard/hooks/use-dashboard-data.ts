import useSWR from "swr";

interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  pendingPayments: number;
  upcomingPayments: number;
  recentTransactions: any[];
}

interface Order {
  id: string;
  orderNo: string;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string;
  };
}

interface DashboardData {
  inventoryCount: {
    stock: number;
    divided: number;
    total: number;
  };
  sales: {
    revenue: number;
    orderCount: number;
  };
  pendingTasks: number;
  financeSummary: FinanceSummary | null;
  isLoading: boolean;
  isError: any;
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
});

export function useDashboardData(): DashboardData {
  // Fetch inventory stock count
  const { data: stockData, error: stockError, isLoading: stockLoading } = useSWR(
    "/api/inventory/stock",
    fetcher
  );

  // Fetch divided stock count
  const { data: dividedData, error: dividedError, isLoading: dividedLoading } = useSWR(
    "/api/inventory/divided",
    fetcher
  );

  // Fetch tasks
  const { data: tasksData, error: tasksError, isLoading: tasksLoading } = useSWR(
    "/api/tasks",
    fetcher
  );

  // Fetch orders for sales data
  const { data: ordersData, error: ordersError, isLoading: ordersLoading } = useSWR<Order[]>(
    "/api/sales/orders",
    fetcher
  );

  // Fetch finance summary
  const { data: financeSummary, error: financeError, isLoading: financeLoading } = useSWR<FinanceSummary>(
    "/api/finance/summary",
    fetcher
  );

  const isLoading = stockLoading || dividedLoading || tasksLoading || ordersLoading || financeLoading;
  const isError = stockError || dividedError || tasksError || ordersError || financeError;

  // Calculate inventory counts
  const stockCount = stockData?.length || 0;
  const dividedCount = dividedData?.length || 0;
  const totalInventoryCount = stockCount + dividedCount;

  // Calculate sales data
  const orderCount = ordersData?.length || 0;
  
  // Calculate total revenue from orders if available, otherwise use finance summary
  let revenue = 0;
  if (ordersData && ordersData.length > 0) {
    revenue = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  } else if (financeSummary) {
    revenue = financeSummary.totalRevenue;
  }

  // Calculate pending tasks
  const pendingTasks = tasksData?.filter(
    (task: any) => task.status !== "done"
  )?.length || 0;

  return {
    inventoryCount: {
      stock: stockCount,
      divided: dividedCount,
      total: totalInventoryCount
    },
    sales: {
      revenue,
      orderCount
    },
    pendingTasks,
    financeSummary: financeSummary || null,
    isLoading,
    isError,
  };
} 