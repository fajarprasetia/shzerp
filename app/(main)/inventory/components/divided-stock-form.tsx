"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash, Camera, CameraOff, QrCode, AlertCircle } from "lucide-react";
import { 
  scanBarcode, 
  scanBarcode128, 
  validateStockBarcode, 
  calculateDividedRolls
} from "@/app/lib/inventory";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDividedData } from "@/hooks/use-divided-data";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Form schemas for different modes
const newDividedSchema = z.object({
  barcodeId: z.string().min(1, "Barcode ID is required"),
  meterPerRoll: z.coerce.number().positive("Meter per roll must be a positive number"),
  numberOfRolls: z.coerce.number().int().positive("Number of rolls must be a positive integer"),
  note: z.string().optional(),
});

const currentDividedSchema = z.object({
  rollNo: z.string().min(1, "Roll number is required"),
  gsm: z.coerce.number().min(1, "GSM must be greater than 0"),
  width: z.coerce.number().min(1, "Width must be greater than 0"),
  length: z.coerce.number().min(1, "Length must be greater than 0"),
  remainingLength: z.coerce.number().min(0, "Remaining length must not be negative"),
  barcodeId: z.string().optional(),
  note: z.string().optional(),
});

type Stock = {
  id: string;
  barcodeId: string;
  jumboRollNo: string;
  type: string;
  gsm: number;
  width: number;
  length: number;
  remainingLength: number;
  date: string;
  inspectedBy?: { name: string } | null;
  inspected?: boolean;
};

interface DividedStockFormProps {
  mode: "new" | "current";
  onSuccess: () => void;
  onCancel?: () => void;
}

export function DividedStockForm({ mode, onSuccess, onCancel }: DividedStockFormProps) {
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const [stock, setStock] = useState<Stock | null>(null);
  const { mutate: refreshDividedData } = useDividedData();

  // Form for "new" mode - creating divided stock from existing stock
  const newForm = useForm<z.infer<typeof newDividedSchema>>({
    resolver: zodResolver(newDividedSchema),
    defaultValues: {
      barcodeId: "",
      meterPerRoll: 100,
      numberOfRolls: 1,
      note: "",
    },
  });

  // Form for "current" mode - creating direct divided stock
  const currentForm = useForm<z.infer<typeof currentDividedSchema>>({
    resolver: zodResolver(currentDividedSchema),
    defaultValues: {
      rollNo: "",
      gsm: 100,
      width: 160,
      length: 100,
      remainingLength: 100,
      barcodeId: "",
      note: "",
    },
  });

  // Add useRef for debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add a useEffect to log stock changes
  useEffect(() => {
    console.log("Stock data changed:", stock);
  }, [stock]);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      // Use the new Code 128 scanner instead
      const result = await scanBarcode128();
      
      if (result.success && result.data) {
        if (mode === "new") {
          // For "new" mode, validate the barcode and fetch stock data
          newForm.setValue("barcodeId", result.data); // Set barcode value immediately

          // Perform validation
          try {
            // Directly fetch stock data without using validation function
            const response = await fetch(`/api/inventory/stock/validate?barcode=${result.data}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Invalid barcode");
            }
            
            const stockData = await response.json();
            console.log("Scanned stock data:", stockData);
            
            // Verify it's inspected and has available length
            if (!stockData.inspected || stockData.remainingLength <= 0) {
              const errorMessage = !stockData.inspected 
                ? "This stock has not been inspected yet"
                : "This stock has no remaining length available";
              
              toast.error(errorMessage);
              setStock(null);
            } else {
              // Successfully fetched valid stock data
              setStock(stockData);
              
              // Calculate recommended number of rolls
              const meterPerRoll = newForm.getValues("meterPerRoll") || 100;
              const recommendedCount = Math.floor(stockData.remainingLength / meterPerRoll);
              
              // Update number of rolls if the current value exceeds recommended count
              const currentCount = newForm.getValues("numberOfRolls") || 1;
              if (currentCount > recommendedCount) {
                newForm.setValue("numberOfRolls", recommendedCount > 0 ? recommendedCount : 1);
              }
              
              toast.success("Stock selected successfully");
            }
          } catch (error) {
            console.error("Error validating barcode:", error);
            toast.error(error instanceof Error ? error.message : "Invalid barcode");
            setStock(null);
          }
        } else {
          currentForm.setValue("barcodeId", result.data);
          toast.success("Barcode scanned successfully");
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

  const handleBarcodeValidation = async (barcode: string) => {
    try {
      console.log("Validating barcode:", barcode);
      
      // Skip if empty
      if (!barcode) {
        setStock(null);
        return false;
      }
      
      // Fetch stock data directly
      const response = await fetch(`/api/inventory/stock/validate?barcode=${barcode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invalid barcode");
      }
      
      const stockData = await response.json();
      console.log("Validation result:", stockData);
      
      // Verify it's inspected and has available length
      if (!stockData.inspected || stockData.remainingLength <= 0) {
        const errorMessage = !stockData.inspected 
          ? "This stock has not been inspected yet"
          : "This stock has no remaining length available";
            
        toast.error(errorMessage);
        setStock(null);
        return false;
      }
      
      // Set the stock data
      setStock(stockData);
      
      // Calculate recommended number of rolls
      const meterPerRoll = newForm.getValues("meterPerRoll") || 100;
      const recommendedCount = Math.floor(stockData.remainingLength / meterPerRoll);
      
      // Update number of rolls if the current value exceeds recommended count
      const currentCount = newForm.getValues("numberOfRolls") || 1;
      if (currentCount > recommendedCount) {
        newForm.setValue("numberOfRolls", recommendedCount > 0 ? recommendedCount : 1);
      }
      
      toast.success("Stock selected successfully");
      
      return true;
    } catch (error) {
      console.error("Validation error:", error);
      // Keep the barcode ID in the form even if validation fails
      // This allows the user to see what they scanned
      toast.error(error instanceof Error ? error.message : "Invalid barcode");
      setStock(null);
      return false;
    }
  };

  const handleBarcodeChange = async (value: string) => {
    console.log("Barcode input changed:", value);
    
    if (!value) {
      setStock(null);
      return;
    }
    
    if (mode === "new") {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set a new timer to call the validation after a short delay
      debounceTimerRef.current = setTimeout(async () => {
        try {
          console.log("Attempting to fetch stock data for barcode:", value);
          // Direct API call without using the validation function
          const response = await fetch(`/api/inventory/stock/validate?barcode=${value}`);
          
          let errorData;
          
          if (!response.ok) {
            errorData = await response.json();
            console.error("Error fetching stock data:", errorData);
            
            // Display the error message in a toast notification
            if (errorData && errorData.error) {
              toast.error(`Stock validation failed: ${errorData.error}`);
            } else {
              toast.error("Failed to validate stock barcode");
            }
            
            setStock(null);
            return;
          }
          
          const stockData = await response.json();
          console.log("Fetched stock data:", stockData);
          
          // Verify it's inspected and has available length
          if (!stockData.inspected || stockData.remainingLength <= 0) {
            const errorMessage = !stockData.inspected 
              ? "This stock has not been inspected yet"
              : "This stock has no remaining length available";
                
            console.warn("Stock validation failed:", errorMessage);
            toast.error(`Stock validation failed: ${errorMessage}`);
            setStock(null);
            return;
          }
          
          // Successfully fetched valid stock data
          console.log("Setting stock data:", stockData);
          setStock(stockData);
          
          // Calculate recommended number of rolls
          const meterPerRoll = newForm.getValues("meterPerRoll") || 100;
          const recommendedCount = Math.floor(stockData.remainingLength / meterPerRoll);
          
          // Update number of rolls if the current value exceeds recommended count
          const currentCount = newForm.getValues("numberOfRolls") || 1;
          if (currentCount > recommendedCount) {
            newForm.setValue("numberOfRolls", recommendedCount > 0 ? recommendedCount : 1);
          }
          
          toast.success("Stock selected successfully");
        } catch (error) {
          console.error("Error during stock validation:", error);
          toast.error(error instanceof Error ? error.message : "Failed to validate stock");
          setStock(null);
        }
      }, 300);
    }
  };

  const onSubmitNew = async (values: z.infer<typeof newDividedSchema>) => {
    if (!stock) {
      toast.error("Please select a valid stock first");
      return;
    }

    // Verify stock has enough remaining length
    const totalLength = values.meterPerRoll * values.numberOfRolls;
    if (totalLength > stock.remainingLength) {
      toast.error(`Not enough remaining length (${stock.remainingLength}m) for the requested total (${totalLength}m)`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/inventory/divided/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId: stock.id,
          length: values.meterPerRoll,
          count: values.numberOfRolls,
          note: values.note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create divided rolls");
      }

      newForm.reset();
      setStock(null);
      
      // Refresh the divided stock data immediately
      await refreshDividedData();
      
      toast.success(`Successfully created ${values.numberOfRolls} divided roll(s)`);
      
      // Call onSuccess after data is refreshed
      onSuccess();
    } catch (error) {
      console.error("Error creating divided rolls:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create divided rolls");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitCurrent = async (values: z.infer<typeof currentDividedSchema>) => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/inventory/divided/current", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create divided roll");
      }

      currentForm.reset();
      
      // Refresh the divided stock data immediately
      await refreshDividedData();
      
      toast.success("Divided roll created successfully");
      
      // Call onSuccess after data is refreshed
      onSuccess();
    } catch (error) {
      console.error("Error creating divided roll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create divided roll");
    } finally {
      setLoading(false);
    }
  };

  const recommendedRolls = 
    stock && newForm.watch("meterPerRoll") 
      ? Math.floor(stock.remainingLength / newForm.watch("meterPerRoll"))
      : 0;

  // Render the appropriate form based on mode
  if (mode === "new") {
    return (
      <Form {...newForm}>
        <form onSubmit={newForm.handleSubmit(onSubmitNew)} className="space-y-4 max-h-[80vh] overflow-y-auto pb-4 px-1">
          <FormField
            control={newForm.control}
            name="barcodeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scan Jumbo Roll Barcode *</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormControl className="flex-grow">
                    <Input
                      id="barcodeId"
                      placeholder="Scan or enter barcode ID"
                      autoComplete="off"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleBarcodeChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleScan}
                    disabled={isScanning}
                  >
                    {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setUseBackCamera(!useBackCamera)}
                    className="hidden sm:flex"
                  >
                    {useBackCamera ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  </Button>
                </div>
                <FormDescription className="text-xs">
                  Scan the Jumbo Roll barcode or enter it manually
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Add warning alert for uninspected stock */}
          {newForm.watch("barcodeId") && !stock && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Inspection Required</AlertTitle>
              <AlertDescription>
                This stock must be inspected before it can be divided. Please complete the inspection process first.
              </AlertDescription>
            </Alert>
          )}

          {stock && (
            <Card className="bg-muted/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Selected Stock</CardTitle>
                <CardDescription className="text-xs">
                  Barcode ID: {stock.barcodeId}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Roll No:</div>
                  <div>{stock.jumboRollNo}</div>
                  <div className="font-medium">Type:</div>
                  <div>{stock.type}</div>
                  <div className="font-medium">GSM:</div>
                  <div>{stock.gsm}</div>
                  <div className="font-medium">Width:</div>
                  <div>{stock.width} mm</div>
                  <div className="font-medium">Original Length:</div>
                  <div>{stock.length} m</div>
                  <div className="font-medium">Remaining Length:</div>
                  <div className="flex items-center">
                    {stock.remainingLength} m
                    {stock.remainingLength < 50 && (
                      <Badge variant="destructive" className="ml-2 text-xs py-0">Low</Badge>
                    )}
                  </div>
                  {stock.inspected && (
                    <>
                      <div className="font-medium">Inspection:</div>
                      <div className="flex items-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-0">
                          Inspected
                        </Badge>
                      </div>
                    </>
                  )}
                  {stock.inspectedBy && (
                    <>
                      <div className="font-medium">Inspected By:</div>
                      <div>{stock.inspectedBy.name}</div>
                    </>
                  )}
                </div>
              </CardContent>
              <Separator />
              <CardContent className="py-3">
                <div className="text-sm text-muted-foreground">
                  {recommendedRolls > 0 ? (
                    <span className="text-green-600">
                      You can create up to {recommendedRolls} roll(s) with {newForm.watch("meterPerRoll")}m each
                    </span>
                  ) : (
                    <span className="text-red-600">
                      Not enough remaining length for the specified meter per roll
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={newForm.control}
              name="meterPerRoll"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meter Per Roll *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={newForm.control}
              name="numberOfRolls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Rolls *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  {stock && (
                    <FormDescription className="text-xs">
                      Recommended: max {recommendedRolls} roll(s)
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={newForm.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any additional notes here"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !stock || (stock && newForm.watch("numberOfRolls") > recommendedRolls) || newForm.watch("meterPerRoll") <= 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Divided Rolls
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    );
  } else {
    return (
      <Form {...currentForm}>
        <form onSubmit={currentForm.handleSubmit(onSubmitCurrent)} className="space-y-4 max-h-[80vh] overflow-y-auto pb-4 px-1">
          <FormField
            control={currentForm.control}
            name="rollNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roll Number *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter roll number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={currentForm.control}
              name="gsm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSM *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={currentForm.control}
              name="width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Width (mm) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={currentForm.control}
              name="length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Length (m) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={currentForm.control}
              name="remainingLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remaining Length (m) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Initially should be the same as total length
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={currentForm.control}
            name="barcodeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barcode ID (Optional)</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        {...field}
                        placeholder="Scan or enter barcode"
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleScan}
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
                </FormControl>
                <FormDescription className="text-xs">
                  {useBackCamera ? "Using back camera" : "Using front camera"} (click camera icon to toggle)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={currentForm.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any additional notes here"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Divided Stock"
              )}
            </Button>
          </div>
        </form>
      </Form>
    );
  }
} 