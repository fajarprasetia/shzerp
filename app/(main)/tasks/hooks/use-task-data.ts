import useSWR from "swr";
import { Task } from "@/types/task";

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return res.json();
});

export function useTaskData() {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    "/api/tasks",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
} 