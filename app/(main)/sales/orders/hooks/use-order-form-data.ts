"use client";

import { useState, useEffect } from "react";
import { Stock, Divided, Customer } from "@prisma/client";

interface StockWithInspector extends Stock {
  inspector?: { name: string } | null;
}

interface DividedWithGSM extends Divided {
  stock: {
    gsm: number;
    type: string;
  };
  gsm?: number; // Added for compatibility with the form
}

interface OrderFormData {
  customers: Customer[];
  stocks: StockWithInspector[];
  dividedStocks: DividedWithGSM[];
  isLoading: boolean;
}

export function useOrderFormData(): OrderFormData {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stocks, setStocks] = useState<StockWithInspector[]>([]);
  const [dividedStocks, setDividedStocks] = useState<DividedWithGSM[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersRes, stocksRes, dividedStocksRes] = await Promise.all([
          fetch("/api/sales/customer"),
          fetch("/api/inventory/stock"),
          fetch("/api/inventory/divided"),
        ]);

        if (!customersRes.ok || !stocksRes.ok || !dividedStocksRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [customersData, stocksData, dividedStocksRawData] = await Promise.all([
          customersRes.json(),
          stocksRes.json(),
          dividedStocksRes.json(),
        ]);

        // Ensure we have arrays even if the API returns null/undefined
        const safeCustomersData = Array.isArray(customersData) ? customersData : [];
        const safeStocksData = Array.isArray(stocksData) ? stocksData : [];
        const safeDividedStocksData = Array.isArray(dividedStocksRawData) ? dividedStocksRawData : [];

        // Process divided stocks to add gsm property directly on the object
        const processedDividedStocks = safeDividedStocksData.map((divided: DividedWithGSM) => ({
          ...divided,
          gsm: divided.stock?.gsm || 0 // Add gsm property directly
        }));

        // Filter out stocks that don't have remaining length or are already sold
        const filteredStocks = safeStocksData.filter((stock: StockWithInspector) => 
          stock?.remainingLength > 0 && !stock?.isSold
        );

        // Filter out divided stocks that don't have remaining length or are already sold
        const filteredDividedStocks = processedDividedStocks.filter((divided: DividedWithGSM) => 
          divided?.remainingLength > 0 && !divided?.isSold
        );

        console.log("Fetched customers:", safeCustomersData);
        console.log("Filtered stocks:", filteredStocks);
        console.log("Processed divided stocks:", filteredDividedStocks);

        setCustomers(safeCustomersData);
        setStocks(filteredStocks);
        setDividedStocks(filteredDividedStocks);
      } catch (error) {
        console.error("Error fetching order form data:", error);
        // Set empty arrays on error to prevent undefined values
        setCustomers([]);
        setStocks([]);
        setDividedStocks([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return {
    customers: customers || [],
    stocks: stocks || [],
    dividedStocks: dividedStocks || [],
    isLoading,
  };
} 