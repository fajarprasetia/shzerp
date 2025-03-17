"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stock } from "@prisma/client";
import { BarcodeIcon } from "lucide-react";
import { scanBarcode } from "@/lib/inventory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockWithInspector } from "@/hooks/use-stock-data";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BrowserMultiFormatReader } from "@zxing/library";

const STOCK_TYPES = [
  "Sublimation Paper",
  "Protect Paper",
  "DTF Film",
  "Ink"
] as const;

export interface StockFormProps {
  initialData?: Stock;
  onSubmit: (data: Stock) => void;
  onCancel: () => void;
}

export function StockForm({ initialData, onSubmit, onCancel }: StockFormProps) {
  const [scanning, setScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [formData, setFormData] = useState({
    jumboRollNo: initialData?.jumboRollNo || "",
    barcodeId: initialData?.barcodeId || "",
    type: initialData?.type || "",
    gsm: initialData?.gsm?.toString() || "",
    width: initialData?.width?.toString() || "",
    length: initialData?.length?.toString() || "",
    weight: initialData?.weight?.toString() || "",
    containerNo: initialData?.containerNo || "",
    arrivalDate: initialData?.arrivalDate ? new Date(initialData.arrivalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    note: initialData?.note || "",
  });

  useEffect(() => {
    if (!initialData) {
      generateJumboRollNo();
    }
  }, [initialData]);

  const generateJumboRollNo = async () => {
    try {
      const response = await fetch("/api/inventory/stock/generate-roll-no");
      if (!response.ok) throw new Error("Failed to generate roll number");
      const { rollNo } = await response.json();
      setFormData(prev => ({ ...prev, jumboRollNo: rollNo }));
    } catch (error) {
      console.error("Error generating roll number:", error);
      alert("Failed to generate roll number. Please try again.");
    }
  };

  const handleChange = (
    name: string,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScan = async () => {
    setShowScanner(true);
  };

  const handleBarcodeScanned = (value: string) => {
    setFormData(prev => ({ ...prev, barcodeId: value }));
    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = initialData ? "PUT" : "POST";
      const url = initialData 
        ? `/api/inventory/stock/${initialData.id}`
        : "/api/inventory/stock";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          gsm: parseFloat(formData.gsm),
          width: parseFloat(formData.width),
          length: parseFloat(formData.length),
          weight: parseFloat(formData.weight),
          arrivalDate: new Date(formData.arrivalDate),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save stock");
      }

      onSubmit(await res.json());
    } catch (error) {
      console.error("Error saving stock:", error);
      alert(error instanceof Error ? error.message : "Failed to save stock");
    }
  };

  const BarcodeScanner = ({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) => {
    const [error, setError] = useState<string>("");
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    useEffect(() => {
      let stream: MediaStream | null = null;
      let isActive = true; // Add flag to prevent operations after cleanup

      const startCamera = async () => {
        try {
          // Initialize code reader first
          if (!codeReaderRef.current) {
            codeReaderRef.current = new BrowserMultiFormatReader();
            await codeReaderRef.current.listVideoInputDevices(); // Ensure reader is ready
          }

          // Get camera stream
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
          
          if (!isActive) return; // Check if component is still mounted

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          // Ensure code reader exists before starting scan
          if (codeReaderRef.current && videoRef.current) {
            try {
              codeReaderRef.current.decodeFromVideoDevice(
                null, 
                videoRef.current, 
                (result) => {
                  if (result && isActive) {
                    // Stop scanning and camera when barcode is detected
                    if (codeReaderRef.current) {
                      codeReaderRef.current.reset();
                    }
                    if (stream) {
                      stream.getTracks().forEach(track => track.stop());
                    }
                    onScan(result.getText());
                    onClose();
                  }
                }
              );
            } catch (scanError) {
              console.error("Scan error:", scanError);
              setError("Failed to start barcode scanning");
            }
          }

        } catch (err) {
          if (isActive) {
            setError("Failed to access camera. Please make sure you have granted camera permissions.");
            console.error("Camera error:", err);
          }
        }
      };

      startCamera();

      // Cleanup function
      return () => {
        isActive = false; // Set flag to prevent async operations

        // Stop the barcode reader
        if (codeReaderRef.current) {
          try {
            codeReaderRef.current.reset();
          } catch (e) {
            console.error("Error resetting code reader:", e);
          }
          codeReaderRef.current = null;
        }

        // Stop the camera stream
        if (stream) {
          try {
            stream.getTracks().forEach(track => track.stop());
          } catch (e) {
            console.error("Error stopping camera stream:", e);
          }
        }

        // Clear video source
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }, [onScan, onClose]);

    return (
      <div className="space-y-4">
        {error ? (
          <div className="text-destructive text-sm">{error}</div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full max-w-[640px] h-auto"
              autoPlay
              playsInline
              muted
            />
            <p className="text-sm text-muted-foreground">
              Position the barcode in front of the camera
            </p>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jumboRollNo">Jumbo Roll No.</Label>
          <Input
            id="jumboRollNo"
            name="jumboRollNo"
            value={formData.jumboRollNo}
            readOnly
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcodeId">Barcode ID *</Label>
          <div className="flex gap-2">
            <Input
              id="barcodeId"
              name="barcodeId"
              value={formData.barcodeId}
              onChange={handleInputChange}
              required
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleScan}
              disabled={scanning}
            >
              <BarcodeIcon className="h-4 w-4 mr-2" />
              {scanning ? "Scanning..." : "Scan"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gsm">GSM *</Label>
            <Input
              id="gsm"
              name="gsm"
              type="number"
              step="0.01"
              value={formData.gsm}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="width">Width (cm) *</Label>
            <Input
              id="width"
              name="width"
              type="number"
              step="0.01"
              value={formData.width}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="length">Length (m) *</Label>
            <Input
              id="length"
              name="length"
              type="number"
              step="0.01"
              value={formData.length}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.01"
              value={formData.weight}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="containerNo">Container No. *</Label>
            <Input
              id="containerNo"
              name="containerNo"
              value={formData.containerNo}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="arrivalDate">Arrival Date *</Label>
          <Input
            id="arrivalDate"
            name="arrivalDate"
            type="date"
            value={formData.arrivalDate}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            name="note"
            value={formData.note}
            onChange={handleInputChange}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>

      <Dialog 
        open={showScanner} 
        onOpenChange={(open) => {
          if (!open) {
            // Ensure cleanup when dialog is closed
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            setShowScanner(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Position the barcode in front of the camera to scan
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner
            onScan={handleBarcodeScanned}
            onClose={() => setShowScanner(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
} 