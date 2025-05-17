"use client";

import { useState, useEffect } from "react";
import { Stock, Divided, Customer, User } from "@prisma/client";

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

interface MarketingUser {
  id: string;
  name: string;
  email?: string;
}

interface OrderFormData {
  customers: Customer[];
  stocks: StockWithInspector[];
  dividedStocks: DividedWithGSM[];
  marketingUsers: MarketingUser[];
  isLoading: boolean;
}

export function useOrderFormData(): OrderFormData {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stocks, setStocks] = useState<StockWithInspector[]>([]);
  const [dividedStocks, setDividedStocks] = useState<DividedWithGSM[]>([]);
  const [marketingUsers, setMarketingUsers] = useState<MarketingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Use the form-data endpoint that now includes marketing users
        const response = await fetch("/api/sales/orders/form-data");
        
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const data = await response.json();
        
        // Ensure we have arrays even if the API returns null/undefined
        const safeCustomersData = Array.isArray(data.customers) ? data.customers : [];
        const safeStocksData = Array.isArray(data.stocks) ? data.stocks : [];
        const safeDividedStocksData = Array.isArray(data.dividedStocks) ? data.dividedStocks : [];
        const safeMarketingUsersData = Array.isArray(data.marketingUsers) ? data.marketingUsers : [];

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
        console.log("Marketing users:", safeMarketingUsersData);

        setCustomers(safeCustomersData);
        setStocks(filteredStocks);
        setDividedStocks(filteredDividedStocks);
        setMarketingUsers(safeMarketingUsersData);
      } catch (error) {
        console.error("Error fetching order form data:", error);
        // Set empty arrays on error to prevent undefined values
        setCustomers([]);
        setStocks([]);
        setDividedStocks([]);
        setMarketingUsers([]);
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
    marketingUsers: marketingUsers || [],
    isLoading,
  };
} 