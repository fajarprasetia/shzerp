import useSWR from "swr";

interface LogEntry {
  id: string;
  type: "stock_created" | "divided_created" | "stock_inspected" | "divided_inspected";
  itemId: string;
  itemType: "stock" | "divided";
  itemIdentifier: string;
  userId: string | null;
  userName: string | null;
  createdAt: Date;
}

interface PaginatedResponse {
  data: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseInspectionLogsOptions {
  page?: number;
  limit?: number;
  type?: string;
  itemType?: string;
  startDate?: Date;
  endDate?: Date;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useInspectionLogs(options: UseInspectionLogsOptions = {}) {
  const {
    page = 1,
    limit = 50,
    type,
    itemType,
    startDate,
    endDate,
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(type && { type }),
    ...(itemType && { itemType }),
    ...(startDate && { startDate: startDate.toISOString() }),
    ...(endDate && { endDate: endDate.toISOString() }),
  });

  const { data, error, mutate } = useSWR<PaginatedResponse>(
    `/api/inventory/logs?${params.toString()}`,
    fetcher
  );

  return {
    data: data?.data || [],
    pagination: data?.pagination,
    isLoading: !data,
    isError: error,
    mutate,
  };
} 