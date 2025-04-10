"use client";

import { useInspectionData } from "../hooks/use-inspection-data";
import { InspectionTable } from "../components/inspection-table";
import { Loader2, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { scanBarcode } from "@/lib/inventory";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InspectionPage() {
  const { 
    uninspectedStock, 
    uninspectedDivided, 
    logs, 
    isLoading, 
    isError,
    mutate
  } = useInspectionData();

  const [isScanning, setIsScanning] = useState(false);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastInspectedItem, setLastInspectedItem] = useState("");

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

  const handleScanBarcode = async () => {
    setIsScanning(true);
    try {
      const result = await scanBarcode(useBackCamera);
      
      if (result.success && result.data) {
        const scannedBarcode = result.data;
        console.log("Scanned barcode:", scannedBarcode);
        
        // Check if the barcode matches any stock items
        const stockMatch = uninspectedStock.find(
          stock => stock.jumboRollNo === scannedBarcode || stock.barcodeId === scannedBarcode
        );
        
        // Check if the barcode matches any divided items
        const dividedMatch = uninspectedDivided.find(
          divided => divided.rollNo === scannedBarcode || divided.barcodeId === scannedBarcode
        );
        
        if (stockMatch) {
          // Inspect the stock item
          await inspectStockItem(stockMatch.id);
          setLastInspectedItem(stockMatch.jumboRollNo);
          setShowSuccessDialog(true);
        } else if (dividedMatch) {
          // Inspect the divided item
          await inspectDividedItem(dividedMatch.id);
          setLastInspectedItem(dividedMatch.rollNo);
          setShowSuccessDialog(true);
        } else {
          toast.error("No matching uninspected item found for this barcode");
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to scan barcode. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const inspectStockItem = async (stockId: string) => {
    try {
      const response = await fetch("/api/inventory/inspection/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          note: "Inspected via barcode scan",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to inspect stock");
      }

      // Refresh the data
      await mutate();
      return true;
    } catch (error) {
      console.error("Error inspecting stock:", error);
      toast.error(error instanceof Error ? error.message : "Failed to inspect stock");
      return false;
    }
  };

  const inspectDividedItem = async (dividedId: string) => {
    try {
      const response = await fetch("/api/inventory/inspection/divided", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dividedId,
          note: "Inspected via barcode scan",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to inspect divided stock");
      }

      // Refresh the data
      await mutate();
      return true;
    } catch (error) {
      console.error("Error inspecting divided stock:", error);
      toast.error(error instanceof Error ? error.message : "Failed to inspect divided stock");
      return false;
    }
  };

  const scanMore = () => {
    setShowSuccessDialog(false);
    handleScanBarcode();
  };

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
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Inspection</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setUseBackCamera(!useBackCamera)}
            variant="outline"
            size="sm"
          >
            {useBackCamera ? "Using Back Camera" : "Using Front Camera"}
          </Button>
          <Button 
            onClick={handleScanBarcode}
            disabled={isScanning || (uninspectedStock.length === 0 && uninspectedDivided.length === 0)}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Scan Barcode
              </>
            )}
          </Button>
        </div>
      </div>
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

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Item Successfully Inspected</AlertDialogTitle>
            <AlertDialogDescription>
              {lastInspectedItem} has been successfully inspected. Would you like to scan another item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowSuccessDialog(false)}>
              No, I'm Done
            </Button>
            <Button onClick={scanMore}>
              Yes, Scan Another
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 