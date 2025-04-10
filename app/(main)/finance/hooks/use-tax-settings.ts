"use client";

import useSWR from "swr";
import { toast } from "@/components/ui/use-toast";

interface TaxSettings {
  [taxType: string]: {
    [key: string]: any;
  };
}

export function useTaxSettings() {
  const { data, error, mutate, isLoading } = useSWR<TaxSettings>(
    "/api/finance/tax-settings",
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch tax settings");
      }
      return response.json();
    }
  );

  // Update all settings for a specific tax type
  const updateTaxSettings = async (taxType: string, settings: Record<string, any>) => {
    try {
      const response = await fetch("/api/finance/tax-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taxType, settings }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tax settings");
      }

      mutate();

      toast({
        title: "Settings updated",
        description: `${taxType} settings have been successfully updated.`,
      });

      return true;
    } catch (error) {
      console.error("Error updating tax settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tax settings",
        variant: "destructive",
      });
      return false;
    }
  };

  // Update a single setting
  const updateSetting = async (taxType: string, key: string, value: any) => {
    try {
      const response = await fetch("/api/finance/tax-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taxType, key, value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tax setting");
      }

      mutate();

      toast({
        title: "Setting updated",
        description: `${taxType} ${key} has been successfully updated.`,
      });

      return true;
    } catch (error) {
      console.error("Error updating tax setting:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tax setting",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get settings for a specific tax type
  const getTaxTypeSettings = (taxType: string) => {
    if (!data) return {};
    return data[taxType] || {};
  };

  // Get a specific setting value
  const getSetting = (taxType: string, key: string, defaultValue: any = null) => {
    const settings = getTaxTypeSettings(taxType);
    return settings[key] !== undefined ? settings[key] : defaultValue;
  };

  return {
    taxSettings: data || {},
    isLoading,
    isError: error,
    updateTaxSettings,
    updateSetting,
    getTaxTypeSettings,
    getSetting,
    mutate,
  };
} 