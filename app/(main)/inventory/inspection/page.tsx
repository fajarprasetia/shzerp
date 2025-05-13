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
import { useTranslation } from "react-i18next";
// Import pre-initialized i18n instance
import i18nInstance from "@/app/i18n";
import { Stock, Divided } from "@prisma/client";

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
  // Use the pre-initialized i18n instance
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  // Local state for optimistic UI updates
  const [localUninspectedStock, setLocalUninspectedStock] = useState<Stock[]>([]);
  const [localUninspectedDivided, setLocalUninspectedDivided] = useState<Divided[]>([]);
  
  // Initialize local state with data from the hook
  useEffect(() => {
    if (uninspectedStock && uninspectedStock.length > 0) {
      setLocalUninspectedStock(uninspectedStock);
    }
    if (uninspectedDivided && uninspectedDivided.length > 0) {
      setLocalUninspectedDivided(uninspectedDivided);
    }
  }, []);  // Run only once on component mount

  // Separate effect to update local state when data changes from the server
  // Only run when uninspectedStock/uninspectedDivided change AND
  // when the length differs from local state (to avoid infinite loops)
  useEffect(() => {
    const shouldUpdateStock = uninspectedStock && 
      localUninspectedStock.length !== uninspectedStock.length;
    
    const shouldUpdateDivided = uninspectedDivided && 
      localUninspectedDivided.length !== uninspectedDivided.length;
    
    if (shouldUpdateStock) {
      setLocalUninspectedStock(uninspectedStock);
    }
    
    if (shouldUpdateDivided) {
      setLocalUninspectedDivided(uninspectedDivided);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uninspectedStock?.length, uninspectedDivided?.length]);

  // Effect to handle mounting and debug i18n state
  useEffect(() => {
    setMounted(true);
    
    // Log i18n state for debugging
    console.log('Inspection page i18n state:', {
      language: i18n?.language,
      isInitialized: i18n?.isInitialized,
      availableLanguages: i18n?.languages || ['en', 'zh']
    });
  }, [i18n]);

  // Handle inspecting a stock item from the UI
  const handleInspectStock = (stockId: string) => {
    // Optimistically update the local state
    setLocalUninspectedStock(prev => prev.filter(item => item.id !== stockId));
    
    // Get the stock item that was just inspected for the success dialog
    const inspectedStock = uninspectedStock.find(stock => stock.id === stockId);
    if (inspectedStock) {
      setLastInspectedItem(inspectedStock.jumboRollNo);
      setShowSuccessDialog(true);
    }
    
    // Also update the remote data through SWR
    mutate();
  };
  
  // Handle inspecting a divided item from the UI
  const handleInspectDivided = (dividedId: string) => {
    // Optimistically update the local state
    setLocalUninspectedDivided(prev => prev.filter(item => item.id !== dividedId));
    
    // Get the divided item that was just inspected for the success dialog
    const inspectedDivided = uninspectedDivided.find(item => item.id === dividedId);
    if (inspectedDivided) {
      setLastInspectedItem(inspectedDivided.rollNo);
      setShowSuccessDialog(true);
    }
    
    // Also update the remote data through SWR
    mutate();
  };

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

  // Effect to refresh data when success dialog is closed
  useEffect(() => {
    if (!showSuccessDialog && lastInspectedItem) {
      // Refresh data when dialog is dismissed
      mutate();
    }
  }, [showSuccessDialog, lastInspectedItem, mutate]);

  const handleScanBarcode = async () => {
    setIsScanning(true);
    try {
      const result = await scanBarcode(useBackCamera);
      
      if (result.success && result.data) {
        const scannedBarcode = result.data;
        console.log("Scanned barcode:", scannedBarcode);
        
        // Check if the barcode matches any stock items using local state
        const stockMatch = localUninspectedStock.find(
          stock => stock.jumboRollNo === scannedBarcode || stock.barcodeId === scannedBarcode
        );
        
        // Check if the barcode matches any divided items using local state
        const dividedMatch = localUninspectedDivided.find(
          divided => divided.rollNo === scannedBarcode || divided.barcodeId === scannedBarcode
        );
        
        if (stockMatch) {
          // Optimistically update local state
          setLocalUninspectedStock(prev => prev.filter(item => item.id !== stockMatch.id));
          await inspectStockItem(stockMatch.id);
          setLastInspectedItem(stockMatch.jumboRollNo);
          setShowSuccessDialog(true);
        } else if (dividedMatch) {
          // Optimistically update local state
          setLocalUninspectedDivided(prev => prev.filter(item => item.id !== dividedMatch.id));
          await inspectDividedItem(dividedMatch.id);
          setLastInspectedItem(dividedMatch.rollNo);
          setShowSuccessDialog(true);
        } else {
          toast.error(t('inventory.inspection.noMatchingItem', 'No matching uninspected item found for this barcode'));
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error(t('inventory.inspection.scanError', 'Failed to scan barcode. Please try again.'));
    } finally {
      setIsScanning(false);
    }
  };

  const inspectStockItem = async (stockId: string) => {
    try {
      // The optimistic update is now handled by the caller
      const response = await fetch("/api/inventory/inspection/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          note: t('inventory.inspection.noteViaBarcode', 'Inspected via barcode scan'),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // In case of error, we need to refresh the data
        mutate();
        throw new Error(data.error || t('inventory.inspection.stockInspectError', 'Failed to inspect stock'));
      }

      // Refresh the data after success
      mutate();
      
      // Show success toast
      toast.success(t('inventory.inspection.stockInspectSuccess', 'Stock item successfully inspected'));
      return true;
    } catch (error) {
      console.error("Error inspecting stock:", error);
      toast.error(error instanceof Error ? error.message : t('inventory.inspection.stockInspectError', 'Failed to inspect stock'));
      return false;
    }
  };

  const inspectDividedItem = async (dividedId: string) => {
    try {
      // The optimistic update is now handled by the caller
      const response = await fetch("/api/inventory/inspection/divided", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dividedId,
          note: t('inventory.inspection.noteViaBarcode', 'Inspected via barcode scan'),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // In case of error, we need to refresh the data
        mutate();
        throw new Error(data.error || t('inventory.inspection.dividedInspectError', 'Failed to inspect divided stock'));
      }

      // Refresh the data after success
      mutate();
      
      // Show success toast
      toast.success(t('inventory.inspection.dividedInspectSuccess', 'Divided stock item successfully inspected'));
      return true;
    } catch (error) {
      console.error("Error inspecting divided stock:", error);
      toast.error(error instanceof Error ? error.message : t('inventory.inspection.dividedInspectError', 'Failed to inspect divided stock'));
      return false;
    }
  };

  const scanMore = () => {
    setShowSuccessDialog(false);
    // Explicitly refresh data before scanning again
    mutate();
    handleScanBarcode();
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted || isLoading) {
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
          {t('inventory.inspection.loadError', 'Something went wrong while loading inspection data. Please try refreshing the page.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8 pt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">{t('inventory.inspection.title', 'Inspection')}</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setUseBackCamera(!useBackCamera)}
            variant="outline"
            size="sm"
          >
            {useBackCamera ? 
              t('inventory.inspection.usingBackCamera', 'Using Back Camera') : 
              t('inventory.inspection.usingFrontCamera', 'Using Front Camera')}
          </Button>
          <Button 
            onClick={handleScanBarcode}
            disabled={isScanning || (uninspectedStock.length === 0 && uninspectedDivided.length === 0)}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('inventory.inspection.scanning', 'Scanning...')}
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                {t('inventory.inspection.scanBarcode', 'Scan Barcode')}
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border bg-card">
          <div className="p-6">
            <h3 className="text-xl font-semibold">{t('inventory.inspection.itemsToInspect', 'Items to Inspect')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('inventory.inspection.waitingItems', '{{count}} items waiting for inspection', 
                { count: uninspectedStock.length + uninspectedDivided.length })}
            </p>
          </div>
          <InspectionTable 
            stocks={localUninspectedStock} 
            divided={localUninspectedDivided}
            onInspectStock={handleInspectStock}
            onInspectDivided={handleInspectDivided}
          />
        </div>
      </div>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.inspection.successTitle', 'Item Successfully Inspected')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.inspection.successDescription', '{{item}} has been successfully inspected. Would you like to scan another item?', 
                { item: lastInspectedItem })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowSuccessDialog(false)}>
              {t('inventory.inspection.noDone', 'No, I\'m Done')}
            </Button>
            <Button onClick={scanMore}>
              {t('inventory.inspection.yesScanMore', 'Yes, Scan Another')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 