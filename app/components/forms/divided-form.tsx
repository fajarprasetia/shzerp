"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ComboBox } from "@/components/ui/combobox";

interface DividedFormProps {
  onSuccess: () => void;
  stocks: {
    id: string;
    type: string;
    gsm: number;
    width: number;
    length: number;
    weight: number;
    containerNo: string;
  }[];
}

export function DividedForm({ onSuccess, stocks }: DividedFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());

      if (!selectedStock) {
        throw new Error("Please select a parent stock");
      }

      const response = await fetch("/api/inventory/divided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          stockId: selectedStock,
          length: Number(data.length),
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
      setIsSubmitting(false);
    }
  };

  const stockOptions = stocks.map((stock) => ({
    value: stock.id,
    label: `${stock.type} - ${stock.gsm}gsm - ${stock.width}mm x ${stock.length}m - ${stock.containerNo}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Parent Stock</Label>
        <ComboBox
          options={stockOptions}
          value={selectedStock}
          onChange={setSelectedStock}
          placeholder="Select parent stock"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="length">Length (m)</Label>
        <Input id="length" name="length" type="number" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Input id="note" name="note" />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Divided Stock"}
      </Button>
    </form>
  );
} 