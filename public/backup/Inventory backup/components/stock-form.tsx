"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stock } from "@prisma/client";
import { BarcodeIcon, Camera, CameraOff } from "lucide-react";
import { scanBarcode } from "@/lib/inventory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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
  const [isScanning, setIsScanning] = useState(false);
  const [useBackCamera, setUseBackCamera] = useState(true);
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
      toast({
        title: "Error",
        description: "Failed to generate roll number. Please try again.",
        variant: "destructive"
      });
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
    try {
      setIsScanning(true);
      const result = await scanBarcode(useBackCamera);
      
      if (result.success && result.data) {
        setFormData(prev => ({ ...prev, barcodeId: result.data }));
        toast({
          title: "Success",
          description: "Barcode scanned successfully!",
        });
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scan barcode. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save stock",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...formData}>
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
              size="icon"
              onClick={handleScan}
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
          <div className="text-xs text-muted-foreground">
            {useBackCamera ? "Using back camera" : "Using front camera"} (click camera button to toggle)
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select
            name="type"
            value={formData.type}
            onValueChange={(value) => handleChange("type", value)}
            required
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gsm">GSM *</Label>
            <Input
              id="gsm"
              name="gsm"
              type="number"
              value={formData.gsm}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (mm) *</Label>
            <Input
              id="width"
              name="width"
              type="number"
              value={formData.width}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Length (m) *</Label>
            <Input
              id="length"
              name="length"
              type="number"
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
              value={formData.weight}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="containerNo">Container No.</Label>
          <Input
            id="containerNo"
            name="containerNo"
            value={formData.containerNo}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="arrivalDate">Arrival Date</Label>
          <Input
            id="arrivalDate"
            name="arrivalDate"
            type="date"
            value={formData.arrivalDate}
            onChange={handleInputChange}
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update" : "Create"} Stock
          </Button>
        </div>
      </form>
    </Form>
  );
} 