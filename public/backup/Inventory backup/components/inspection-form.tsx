"use client";

import { useState } from "react";
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

  const handleScanBarcode = async () => {
    try {
      setIsScanning(true);
      const result = await scanBarcode(useBackCamera);
      
      if (result.success && result.data) {
        setBarcodeInput(result.data);
        toast({
          title: "Success",
          description: "Barcode scanned successfully",
        });
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast({
        title: "Error",
        description: "Failed to scan barcode. Please try again or enter manually.",
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
        title: "Error",
        description: "Barcode is required",
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
          id: item.id,
          barcodeId: barcodeInput,
          remarks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit inspection");
      }

      toast({
        title: "Success",
        description: "Inspection completed successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit inspection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const itemType = 'stock' in item ? 'Divided Stock' : 'Stock';
  const itemName = 'stock' in item
    ? `${item.stock.jumboRollNo}-${item.rollNo || ''}`
    : item.jumboRollNo || '';
  const itemDetails = 'stock' in item
    ? `${item.stock.gsm}gsm, ${item.width}mm x ${item.length}m`
    : `${item.gsm}gsm, ${item.width}mm x ${item.length}m`;

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pb-4 px-1">
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Item Details</CardTitle>
          <CardDescription className="text-xs">
            {itemType} information
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Item ID:</div>
            <div>{itemName}</div>
            
            <div className="font-medium">Specifications:</div>
            <div>{itemDetails}</div>
            
            <div className="font-medium">Type:</div>
            <div>{'stock' in item ? item.stock.type : item.type}</div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="barcodeId">Barcode ID *</Label>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <Input
                id="barcodeId"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or enter barcode"
                className="w-full"
              />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleScanBarcode}
                disabled={isScanning}
                className="h-10 w-10"
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
                className="h-10 w-10"
              >
                {useBackCamera ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <CameraOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {useBackCamera ? "Using back camera" : "Using front camera"} (click camera icon to toggle)
          </p>
        </div>

        <div>
          <Label htmlFor="remarks">Inspection Remarks (Optional)</Label>
          <Textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any inspection notes here..."
            className="min-h-[80px]"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !barcodeInput}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Complete Inspection"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 