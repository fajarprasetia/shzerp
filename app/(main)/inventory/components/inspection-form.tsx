"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarcodeIcon } from "lucide-react";
import { scanBarcode } from "@/lib/inventory";
import { Stock, Divided } from "@prisma/client";

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
  const [scanning, setScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [weight, setWeight] = useState("");

  const handleScanBarcode = async () => {
    try {
      setScanning(true);
      const barcode = await scanBarcode();
      setBarcodeInput(barcode);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      alert("Failed to scan barcode. Please try again or enter manually.");
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (barcodeInput !== item.barcodeId) {
        alert("Barcode does not match. Please verify and try again.");
        return;
      }

      const endpoint = "jumboRollNo" in item
        ? `/api/inventory/stock/${item.id}/inspect`
        : `/api/inventory/divided/${item.id}/inspect`;

      console.log("Sending request to:", endpoint, {
        weight: "jumboRollNo" in item ? undefined : Number(weight),
        userId: "temp-user-id",
        userName: "Temporary User",
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: "jumboRollNo" in item ? undefined : Number(weight),
          userId: "temp-user-id", // TODO: Replace with actual user ID from auth
          userName: "Temporary User", // TODO: Replace with actual user name from auth
        }),
      });

      const text = await response.text();
      console.log("Response text:", text);

      if (!text) {
        throw new Error("Empty response from server");
      }

      const result = JSON.parse(text);
      console.log("Parsed result:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to inspect item");
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to inspect item");
      }

      onSuccess();
    } catch (error) {
      console.error("Error inspecting item:", error);
      alert(error instanceof Error ? error.message : "Failed to inspect item");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Input 
            value={"jumboRollNo" in item ? item.type : item.stock.type} 
            disabled 
          />
        </div>
        <div>
          <Label>GSM</Label>
          <Input 
            value={"jumboRollNo" in item ? item.gsm : item.stock.gsm} 
            disabled 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Barcode ID</Label>
        <div className="flex gap-2">
          <Input
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Enter or scan barcode"
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleScanBarcode}
            disabled={scanning}
          >
            <BarcodeIcon className="h-4 w-4 mr-2" />
            {scanning ? "Scanning..." : "Scan"}
          </Button>
        </div>
      </div>

      {"rollNo" in item && (
        <div className="space-y-2">
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Approve
        </Button>
      </div>
    </form>
  );
} 