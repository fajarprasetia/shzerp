"use client";

import { useState, useEffect } from "react";
import { Stock, Divided, Customer } from "@prisma/client";

interface OrderFormData {
  customers: Customer[];
  stocks: Stock[];
  dividedStocks: Divided[];
  isLoading: boolean;
}

export function useOrderFormData(): OrderFormData {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [dividedStocks, setDividedStocks] = useState<Divided[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersRes, stocksRes, dividedStocksRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/inventory/stock"),
          fetch("/api/inventory/divided"),
        ]);

        if (!customersRes.ok || !stocksRes.ok || !dividedStocksRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [customersData, stocksData, dividedStocksData] = await Promise.all([
          customersRes.json(),
          stocksRes.json(),
          dividedStocksRes.json(),
        ]);

        setCustomers(customersData);
        setStocks(stocksData);
        setDividedStocks(dividedStocksData);
      } catch (error) {
        console.error("Error fetching order form data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return {
    customers,
    stocks,
    dividedStocks,
    isLoading,
  };
} 