"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

interface TaxFiling {
  id: string;
  taxType: string;
  taxPeriod: string;
  dueDate: Date;
  amount: number;
  status: string;
  notes?: string;
  receiptNumber?: string;
  filingDate?: Date;
  attachments?: TaxAttachment[];
}

interface TaxAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

interface UseTaxFilingsOptions {
  status?: string;
  taxType?: string;
  year?: string;
  month?: string;
  quarter?: string;
}

export function useTaxFilings(options: UseTaxFilingsOptions = {}) {
  const { status, taxType, year, month, quarter } = options;
  
  // Build query string
  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  if (taxType) queryParams.append("taxType", taxType);
  if (year) queryParams.append("year", year);
  if (month) queryParams.append("month", month);
  if (quarter) queryParams.append("quarter", quarter);
  
  const queryString = queryParams.toString();
  const url = `/api/finance/tax-filings${queryString ? `?${queryString}` : ""}`;
  
  const { data, error, mutate, isLoading } = useSWR<TaxFiling[]>(url, async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch tax filings");
    }
    return response.json();
  });
  
  // Create a new tax filing
  const createTaxFiling = async (filingData: Omit<TaxFiling, "id">) => {
    try {
      const response = await fetch("/api/finance/tax-filings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filingData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create tax filing");
      }
      
      const newFiling = await response.json();
      mutate();
      
      toast({
        title: "Tax filing created",
        description: "The tax filing has been successfully created.",
      });
      
      return newFiling;
    } catch (error) {
      console.error("Error creating tax filing:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create tax filing",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // Update a tax filing
  const updateTaxFiling = async (id: string, updateData: Partial<TaxFiling>) => {
    try {
      const response = await fetch("/api/finance/tax-filings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...updateData }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update tax filing");
      }
      
      const updatedFiling = await response.json();
      mutate();
      
      toast({
        title: "Tax filing updated",
        description: "The tax filing has been successfully updated.",
      });
      
      return updatedFiling;
    } catch (error) {
      console.error("Error updating tax filing:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tax filing",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  // Mark a tax filing as filed
  const markAsFiled = async (id: string, receiptNumber?: string) => {
    return updateTaxFiling(id, {
      status: "filed",
      filingDate: new Date(),
      receiptNumber,
    });
  };
  
  // Mark multiple tax filings as filed
  const markMultipleAsFiled = async (ids: string[]) => {
    try {
      const promises = ids.map((id) => 
        markAsFiled(id, `${Math.random().toString(36).substring(2, 8).toUpperCase()}`)
      );
      
      await Promise.all(promises);
      mutate();
      
      toast({
        title: "Tax filings updated",
        description: `${ids.length} tax filings marked as filed.`,
      });
    } catch (error) {
      console.error("Error marking tax filings as filed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tax filings",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  return {
    taxFilings: data || [],
    isLoading,
    isError: error,
    mutate,
    createTaxFiling,
    updateTaxFiling,
    markAsFiled,
    markMultipleAsFiled,
  };
} 