"use client";

import { useInspectionData } from "../hooks/use-inspection-data";
import { InspectionTable } from "../components/inspection-table";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function InspectionPage() {
  const { 
    uninspectedStock, 
    uninspectedDivided, 
    logs, 
    isLoading, 
    isError 
  } = useInspectionData();

  // Debug logging
  useEffect(() => {
    console.log("Inspection data:", {
      uninspectedStock,
      uninspectedDivided,
      logs,
      isLoading,
      isError
    });
  }, [uninspectedStock, uninspectedDivided, logs, isLoading, isError]);

  if (isLoading) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <p className="text-muted-foreground">
          Something went wrong while loading inspection data. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Inspection</h2>
      <div className="space-y-4">
        <div className="rounded-md border bg-card">
          <div className="p-6">
            <h3 className="text-xl font-semibold">Items to Inspect</h3>
            <p className="text-sm text-muted-foreground">
              {uninspectedStock.length + uninspectedDivided.length} items waiting for inspection
            </p>
          </div>
          <InspectionTable 
            stocks={uninspectedStock} 
            divided={uninspectedDivided} 
          />
        </div>
      </div>
    </div>
  );
} 