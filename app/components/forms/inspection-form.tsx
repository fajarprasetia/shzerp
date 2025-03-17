"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface InspectionFormProps {
  onSuccess: () => void;
  dividedId: string;
}

export function InspectionForm({ onSuccess, dividedId }: InspectionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());

      const response = await fetch(`/api/inventory/divided/${dividedId}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: Number(data.weight)
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.log("Response text:", text);
        let errorMessage = "Failed to inspect item";
        try {
          const result = JSON.parse(text);
          console.log("Parsed result:", result);
          if (result.error) {
            errorMessage = result.error;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Success",
        description: "Item inspected successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error inspecting item:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to inspect item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="weight">Weight (kg)</Label>
        <Input id="weight" name="weight" type="number" required />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Inspecting..." : "Inspect"}
      </Button>
    </form>
  );
} 