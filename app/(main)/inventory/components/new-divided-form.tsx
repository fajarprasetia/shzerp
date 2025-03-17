"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, BarcodeIcon } from "lucide-react";
import { scanBarcode } from "@/lib/inventory";
import { Stock } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BrowserMultiFormatReader } from "@zxing/library";
import { NotFoundException } from "@zxing/library";

const formSchema = z.object({
  barcodeId: z.string().min(1, "Barcode ID is required"),
  meterPerRoll: z.number().min(1, "Meter per roll must be greater than 0"),
  rollCount: z.number().min(1, "Roll count must be greater than 0"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewDividedFormProps {
  onSuccess: () => void;
}

export function NewDividedForm({ onSuccess }: NewDividedFormProps) {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stock, setStock] = useState<Stock | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcodeId: "",
      meterPerRoll: 0,
      rollCount: 0,
      note: "",
    },
  });

  const handleScan = () => {
    setShowScanner(true);
  };

  const handleBarcodeScanned = async (value: string) => {
    try {
      const response = await fetch(`/api/inventory/stock/validate?barcode=${value}`);
      if (!response.ok) {
        throw new Error("Invalid barcode");
      }
      
      const stockData = await response.json();
      if (stockData.type !== "Sublimation Paper" || stockData.remainingLength <= 0) {
        throw new Error("Invalid stock type or no remaining length");
      }

      setStock(stockData);
      form.setValue("barcodeId", value);
      setShowScanner(false);
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid barcode",
        variant: "destructive",
      });
      setStock(null);
    }
  };

  const handleBarcodeChange = async (value: string) => {
    try {
      if (!value) {
        setStock(null);
        return;
      }

      const response = await fetch(`/api/inventory/stock/validate?barcode=${value}`);
      if (!response.ok) {
        throw new Error("Invalid barcode");
      }
      
      const stockData = await response.json();
      if (stockData.type !== "Sublimation Paper" || stockData.remainingLength <= 0) {
        throw new Error("Invalid stock type or no remaining length");
      }

      setStock(stockData);
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid barcode",
        variant: "destructive",
      });
      setStock(null);
    }
  };

  const BarcodeScanner = ({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) => {
    const [error, setError] = useState<string>("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserMultiFormatReader>(new BrowserMultiFormatReader());

    useEffect(() => {
      let mounted = true;

      const startScanning = async () => {
        try {
          if (!videoRef.current) return;

          const devices = await codeReader.current.listVideoInputDevices();
          if (devices.length === 0) {
            throw new Error("No camera found");
          }

          // Use the first available camera
          const selectedDeviceId = devices[0].deviceId;

          await codeReader.current.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result, err) => {
              if (!mounted) return;
              
              if (result) {
                onScan(result.getText());
                onClose();
              }
              
              if (err && !(err instanceof NotFoundException)) {
                setError("Failed to decode barcode");
              }
            }
          );
        } catch (error) {
          console.error("Scanner error:", error);
          setError(error instanceof Error ? error.message : "Failed to initialize scanner");
        }
      };

      startScanning();

      return () => {
        mounted = false;
        codeReader.current.reset();
      };
    }, [onScan, onClose]);

    return (
      <div className="space-y-4">
        {error ? (
          <div className="text-destructive text-center">{error}</div>
        ) : (
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute inset-0 border-2 border-primary opacity-50 pointer-events-none" />
          </div>
        )}
        <Button variant="outline" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    );
  };

  const onSubmit = async (data: FormValues) => {
    if (!stock) return;

    try {
      setLoading(true);
      const totalLength = data.meterPerRoll * data.rollCount;

      if (totalLength > stock.remainingLength) {
        throw new Error("Total length exceeds available stock length");
      }

      const response = await fetch("/api/inventory/divided/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: stock.id,
          meterPerRoll: data.meterPerRoll,
          rollCount: data.rollCount,
          note: data.note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create divided stock");
      }

      toast({
        title: "Success",
        description: "Divided stock created successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error creating divided stock:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create divided stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recommendedRolls = stock && form.watch("meterPerRoll") 
    ? Math.floor(stock.remainingLength / form.watch("meterPerRoll"))
    : 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="barcodeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode ID *</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      handleBarcodeChange(e.target.value);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScan}
                  disabled={scanning}
                >
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarcodeIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {stock && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
              <div>
                <div className="text-sm font-medium">Jumbo Roll No.</div>
                <div className="text-sm text-muted-foreground">{stock.jumboRollNo}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Type</div>
                <div className="text-sm text-muted-foreground">{stock.type}</div>
              </div>
              <div>
                <div className="text-sm font-medium">GSM</div>
                <div className="text-sm text-muted-foreground">{stock.gsm}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Width</div>
                <div className="text-sm text-muted-foreground">{stock.width}mm</div>
              </div>
              <div>
                <div className="text-sm font-medium">Remaining Length</div>
                <div className="text-sm text-muted-foreground">{stock.remainingLength}m</div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="meterPerRoll"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meter per Roll *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rollCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Count *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Recommended: {recommendedRolls} Rolls
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <Dialog 
          open={showScanner} 
          onOpenChange={(open) => {
            if (!open) {
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

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading || !stock}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
} 