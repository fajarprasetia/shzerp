import useSWR from "swr";
import { User } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }
  return res.json();
});

export function useUserData() {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    "/api/users",
    fetcher
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
} 