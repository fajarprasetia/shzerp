"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stock } from "@prisma/client";
import { BarcodeIcon, Camera, CameraOff } from "lucide-react";
import {
  scanBarcode,
  scanBarcode128,
  generateJumboRollNo as generateRollNo,
} from "@/app/lib/inventory";
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
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

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
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!initialData) {
      generateJumboRollNo().catch(error => {
        console.error("Error generating roll number:", error);
        toast({
          title: t('common.error', 'Error'),
          description: t('inventory.stock.generateRollNoError', 'Failed to generate roll number. Please try again.'),
          variant: "destructive"
        });
      });
    }
  }, [initialData, t]);

  const generateJumboRollNo = async () => {
    try {
      const rollNo = await generateRollNo();
      setFormData(prev => ({ ...prev, jumboRollNo: rollNo }));
    } catch (error) {
      console.error("Error generating roll number:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.stock.generateRollNoError', 'Failed to generate roll number. Please try again.'),
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
      
      // Display a helpful message before starting the scanner
      toast({
        title: t('inventory.stock.startingScan', 'Starting scanner'),
        description: t('inventory.stock.scanInstructions', 'Position the barcode within the scanning box. Keep the camera steady.'),
      });
      
      // Configure the scanner with mobile-friendly options
      const result = await scanBarcode128({
        // Lower the success threshold for mobile devices
        successThreshold: 2,
        // Increase scanning frequency
        frequency: 15,
        // Configure locator for better mobile performance
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        // Timeout after 30 seconds (shorter than default 60s)
        timeout: 30000,
      });
      
      if (result.success && result.data) {
        const scannedData: string = result.data!;
        setFormData(prev => ({ 
          ...prev, 
          barcodeId: scannedData
        }));
        toast({
          title: t('common.success', 'Success'),
          description: t('inventory.stock.barcodeScanned', 'Barcode scanned successfully!'),
        });
      } else if (result.error) {
        // More descriptive error handling
        let errorMessage = result.error;
        
        // Provide more user-friendly error messages
        if (result.error.includes('cancelled')) {
          errorMessage = t('inventory.stock.scanCancelled', 'Scanning was cancelled');
        } else if (result.error.includes('timed out')) {
          errorMessage = t('inventory.stock.scanTimeout', 'Scanning timed out. Try holding the camera more steady or adjusting lighting conditions.');
        } else if (result.error.includes('permissions')) {
          errorMessage = t('inventory.stock.cameraPermissionDenied', 'Camera access was denied. Please allow camera permissions to scan barcodes.');
        }
        
        toast({
          title: t('common.error', 'Error'),
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.stock.scanError', 'Failed to scan barcode. Please try again or enter manually.'),
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields before submitting
    const requiredFields = [
      'jumboRollNo', 'barcodeId', 'type', 'gsm', 'width', 'length', 'weight', 'containerNo'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.stock.missingFields', 'Please fill in all required fields: {{fields}}', 
          { fields: missingFields.join(', ') }),
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Convert numeric values and ensure they're valid numbers
      const processedData = {
        ...formData,
        gsm: parseFloat(formData.gsm) || 0,
        width: parseFloat(formData.width) || 0,
        length: parseFloat(formData.length) || 0,
        weight: parseFloat(formData.weight) || 0,
        arrivalDate: new Date(formData.arrivalDate),
      };
      
      console.log("Submitting stock data:", processedData);
      
      const method = initialData ? "PUT" : "POST";
      const url = initialData 
        ? `/api/inventory/stock/${initialData.id}`
        : "/api/inventory/stock";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server returned error:", errorData);
        throw new Error(errorData.error || t('inventory.stock.saveError', 'Failed to save stock'));
      }

      const responseData = await res.json();
      console.log("Stock saved successfully:", responseData);
      onSubmit(responseData);
    } catch (error) {
      console.error("Error saving stock:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('inventory.stock.saveError', 'Failed to save stock'),
        variant: "destructive"
      });
    }
  };

  if (!mounted) {
    return <div>{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">
          {initialData ? t('inventory.stock.editStock', 'Edit Stock') : t('inventory.stock.addStock', 'Add New Stock')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {initialData 
            ? t('inventory.stock.editStockDescription', 'Edit the details of an existing stock item.')
            : t('inventory.stock.addStockDescription', 'Enter the details to add a new stock item to the inventory.')
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="jumboRollNo">{t('inventory.stock.jumboRollNo', 'Jumbo Roll No.')}</Label>
              <Input
                id="jumboRollNo"
                name="jumboRollNo"
                value={formData.jumboRollNo}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>

            <div className="relative">
              <Label htmlFor="barcodeId">{t('inventory.stock.barcodeId', 'Barcode ID')}</Label>
              <div className="flex mt-1.5">
                <Input
                  id="barcodeId"
                  name="barcodeId"
                  value={formData.barcodeId}
                  onChange={handleInputChange}
                  className="flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleScan}
                  className="ml-2"
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="type">{t('inventory.stock.type', 'Type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={t('inventory.stock.selectType', 'Select a type')} />
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

            <div>
              <Label htmlFor="gsm">{t('inventory.stock.gsm', 'GSM')}</Label>
              <Input
                id="gsm"
                name="gsm"
                type="number"
                value={formData.gsm}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="width">{t('inventory.stock.width', 'Width (mm)')}</Label>
              <Input
                id="width"
                name="width"
                type="number"
                value={formData.width}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="length">{t('inventory.stock.length', 'Length (mm)')}</Label>
              <Input
                id="length"
                name="length"
                type="number"
                value={formData.length}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="weight">{t('inventory.stock.weight', 'Weight (kg)')}</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={formData.weight}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="containerNo">{t('inventory.stock.containerNo', 'Container No.')}</Label>
              <Input
                id="containerNo"
                name="containerNo"
                value={formData.containerNo}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="arrivalDate">{t('inventory.stock.arrivalDate', 'Arrival Date')}</Label>
              <Input
                id="arrivalDate"
                name="arrivalDate"
                type="date"
                value={formData.arrivalDate}
                onChange={handleInputChange}
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="note">{t('inventory.stock.note', 'Note')}</Label>
              <Textarea
                id="note"
                name="note"
                value={formData.note || ""}
                onChange={handleInputChange}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit">
            {initialData ? t('common.save', 'Save') : t('common.create', 'Create')}
          </Button>
        </div>
      </form>
    </div>
  );
} 