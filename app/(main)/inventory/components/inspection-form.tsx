"use client";

import { useState, useEffect } from "react";
import { Stock, Divided } from "@prisma/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { scanBarcode } from "@/lib/inventory";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, CameraOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface StockWithInspector extends Stock {
  inspectedBy?: {
    name: string;
  };
}

interface DividedWithDetails extends Divided {
  stock: {
    jumboRollNo: string;
    type: string;
    gsm: number;
  };
  inspectedBy?: {
    name: string;
  };
}

interface InspectionFormProps {
  item: StockWithInspector | DividedWithDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InspectionForm({ item, onSuccess, onCancel }: InspectionFormProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScanBarcode = async () => {
    try {
      setIsScanning(true);
      const result = await scanBarcode(useBackCamera);
      
      if (result.success && result.data) {
        setBarcodeInput(result.data);
        toast({
          title: t('common.success', 'Success'),
          description: t('inventory.inspection.barcodeScanned', 'Barcode scanned successfully'),
        });
      } else if (result.error) {
        toast({
          title: t('common.error', 'Error'),
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.inspection.scanError', 'Failed to scan barcode. Please try again or enter manually.'),
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcodeInput) {
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.inspection.barcodeRequired', 'Barcode is required'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const endpoint = 'stock' in item ? '/api/inventory/inspection/divided' : '/api/inventory/inspection/stock';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockId: 'stock' in item ? undefined : item.id,
          dividedId: 'stock' in item ? item.id : undefined,
          note: remarks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('inventory.inspection.inspectionError', 'Failed to complete inspection'));
      }

      toast({
        title: t('inventory.inspection.inspectionCompleted', 'Inspection Completed'),
        description: t('inventory.inspection.itemInspected', 'Item successfully inspected'),
      });

      onSuccess();
    } catch (error) {
      console.error("Error during inspection:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('inventory.inspection.inspectionError', 'Failed to complete inspection'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-6">
          {t('common.loading', 'Loading...')}
        </CardContent>
      </Card>
    );
  }

  const itemType = 'stock' in item ? 'Divided Stock' : 'Stock';
  const itemName = 'stock' in item
    ? `${item.stock.jumboRollNo}-${item.rollNo || ''}`
    : item.jumboRollNo || '';
  const itemDetails = 'stock' in item
    ? `${item.stock.gsm}gsm, ${item.width}mm x ${item.length}m`
    : `${item.gsm}gsm, ${item.width}mm x ${item.length}m`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('inventory.inspection.inspectItem', 'Inspect Item')}
        </CardTitle>
        <CardDescription>
          {'stock' in item 
            ? t('inventory.inspection.inspectDividedDescription', 'Inspecting divided roll {{rollNo}}', { rollNo: item.rollNo })
            : t('inventory.inspection.inspectStockDescription', 'Inspecting jumbo roll {{rollNo}}', { rollNo: item.jumboRollNo })
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">
              {t('inventory.inspection.scanConfirmBarcode', 'Scan/Confirm Barcode')}
            </Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={t('inventory.inspection.enterBarcode', 'Enter or scan barcode')}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleScanBarcode}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setUseBackCamera(!useBackCamera)}
              >
                {useBackCamera ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <CameraOff className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {useBackCamera 
                ? t('inventory.inspection.usingBackCamera', 'Using back camera')
                : t('inventory.inspection.usingFrontCamera', 'Using front camera')
              } ({t('inventory.inspection.clickCameraToToggle', 'click camera button to toggle')})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">
              {t('inventory.inspection.inspectionRemarks', 'Inspection Remarks')}
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={t('inventory.inspection.remarksPlaceholder', 'Enter any notes or observations about this item')}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('inventory.inspection.inspecting', 'Inspecting...')}
                </>
              ) : (
                t('inventory.inspection.completeInspection', 'Complete Inspection')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 