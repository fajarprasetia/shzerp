"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stock } from "@prisma/client";
import { BarcodeIcon, Loader2 } from "lucide-react";
import { scanBarcode, validateStockBarcode } from "@/lib/inventory";
import { ComboBox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockData } from "@/hooks/use-stock-data";

interface DividedFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

interface StockWithInspector extends Stock {
  inspectedBy: { name: string } | null;
}

export function DividedForm({ onSuccess, onCancel }: DividedFormProps) {
  const [scanning, setScanning] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [formData, setFormData] = useState({
    length: "",
    count: "",
    note: "",
  });
  const { data: stockData, isLoading } = useStockData();

  // Only filter stocks with remaining length
  const availableStocks = (stockData as StockWithInspector[] || []).filter(stock => 
    stock.remainingLength > 0
  );

  console.log("Raw stock data:", stockData);
  console.log("Available stocks:", availableStocks);

  const stockOptions = availableStocks.map(stock => ({
    label: `${stock.jumboRollNo || ''} - ${stock.gsm}gsm ${stock.width}mm x ${stock.length}m`,
    value: stock.id
  }));

  // Debug logging
  useEffect(() => {
    console.log("Stock data:", stockData);
  }, [stockData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScanBarcode = async () => {
    try {
      setScanning(true);
      const barcode = await scanBarcode();
      const stock = await validateStockBarcode(barcode);
      if (stock && stock.type === "Jumbo Roll" && stock.inspected && stock.remainingLength > 0) {
        setSelectedStock(stock);
      } else {
        alert("Selected stock is not a valid Jumbo Roll or has no available length");
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      alert("Failed to scan barcode. Please try again or select manually.");
    } finally {
      setScanning(false);
    }
  };

  const handleStockSelect = (stockId: string) => {
    console.log("Selecting stock with ID:", stockId);
    const stock = availableStocks.find(s => s.id === stockId);
    console.log("Found stock:", stock);
    if (stock) {
      console.log("Setting selected stock");
      setSelectedStock(stock);
      setFormData({
        length: "",
        count: "",
        note: "",
      });
    }
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) {
      alert("Please select a parent stock first");
      return;
    }

    try {
      const length = parseFloat(formData.length);
      const count = parseInt(formData.count);
      
      if (isNaN(length) || isNaN(count) || length <= 0 || count <= 0) {
        alert("Please enter valid length and count values");
        return;
      }

      if (length * count > selectedStock.remainingLength) {
        alert("Total length exceeds available stock length. Please adjust values.");
        return;
      }

      const requestData = {
        stockId: selectedStock.id,
        length,
        count,
        note: formData.note,
      };
      
      console.log("Sending request with data:", requestData);

      const res = await fetch("/api/inventory/divided/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Invalid response from server");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create divided stock");
      }

      console.log("Successfully created divided stocks:", data);
      onSuccess();
      setFormData({ length: "", count: "", note: "" });
      setSelectedStock(null);
    } catch (error) {
      console.error("Error creating divided stock:", error);
      alert(error instanceof Error ? error.message : "Failed to create divided stock");
    }
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) {
      alert("Please select a parent stock first");
      return;
    }

    try {
      const length = parseFloat(formData.length);
      
      if (isNaN(length) || length <= 0) {
        alert("Please enter a valid length value");
        return;
      }

      if (length > selectedStock.remainingLength) {
        alert("Length exceeds available stock length. Please adjust value.");
        return;
      }

      // Generate roll number based on parent stock
      const rollNo = `${selectedStock.jumboRollNo}-A`;

      const res = await fetch("/api/inventory/divided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcodeId: rollNo, // Use roll number as barcode
          stockId: selectedStock.id,
          width: selectedStock.width, // Use parent stock width
          length,
          note: formData.note,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create divided stock");
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating divided stock:", error);
      alert(error instanceof Error ? error.message : "Failed to create divided stock");
    }
  };

  // Debug logging for render
  useEffect(() => {
    console.log("Current selected stock:", selectedStock);
    console.log("Available stocks:", availableStocks);
    console.log("Stock options:", stockOptions);
  }, [selectedStock, availableStocks, stockOptions]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Parent Stock</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Loading stocks...</span>
              </div>
            ) : (
              <ComboBox
                options={stockOptions}
                value={selectedStock?.id || ""}
                onChange={handleStockSelect}
                placeholder="Select parent stock..."
              />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleScanBarcode}
            disabled={scanning || isLoading}
          >
            <BarcodeIcon className="h-4 w-4 mr-2" />
            {scanning ? "Scanning..." : "Scan"}
          </Button>
        </div>
      </div>

      {selectedStock && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Input value={selectedStock.type} disabled />
            </div>
            <div>
              <Label>GSM</Label>
              <Input value={selectedStock.gsm} disabled />
            </div>
            <div>
              <Label>Width</Label>
              <Input value={selectedStock.width} disabled />
            </div>
            <div>
              <Label>Available Length</Label>
              <Input value={selectedStock.remainingLength} disabled />
            </div>
          </div>

          <Tabs defaultValue="bulk">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bulk">Bulk Creation</TabsTrigger>
              <TabsTrigger value="single">Single Creation</TabsTrigger>
            </TabsList>

            <TabsContent value="bulk">
              <form onSubmit={handleSubmitBulk} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length per Roll (m)</Label>
                  <Input
                    id="length"
                    name="length"
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="count">Number of Rolls</Label>
                  <Input
                    id="count"
                    name="count"
                    type="number"
                    value={formData.count}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit">Create Rolls</Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="single">
              <form onSubmit={handleSubmitSingle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Length (m)</Label>
                  <Input
                    id="length"
                    name="length"
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit">Create Roll</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 