import useSWR from "swr";
import { Transaction, Budget } from "@/types/finance";

interface FinanceData {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  incomeData: number[];
  expenseData: number[];
  balanceData: number[];
  budgets: Budget[];
  recentTransactions: Transaction[];
}

export function useFinanceData() {
  const { data, error, isLoading, mutate } = useSWR<FinanceData>(
    "/api/finance/overview",
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch finance data");
      }
      return response.json();
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
} 