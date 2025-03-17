"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Stock } from "@prisma/client";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface InspectStockButtonProps {
  stock: Stock;
  disabled?: boolean;
}

export function InspectStockButton({ stock, disabled }: InspectStockButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const router = useRouter();

  const handleInspect = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventory/inspection/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId: stock.id,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to inspect stock");
      }

      toast({
        title: "Stock Inspected",
        description: `Successfully inspected ${stock.jumboRollNo}`,
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error inspecting stock:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to inspect stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || stock.inspected}
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        {stock.inspected ? "Inspected" : "Inspect"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspect Stock</DialogTitle>
            <DialogDescription>
              You are about to inspect {stock.jumboRollNo}. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Add inspection notes (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInspect}
              disabled={loading}
            >
              {loading ? "Inspecting..." : "Confirm Inspection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 