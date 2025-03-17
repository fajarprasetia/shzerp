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
import { Divided } from "@prisma/client";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface InspectDividedButtonProps {
  divided: Divided;
  disabled?: boolean;
}

export function InspectDividedButton({ divided, disabled }: InspectDividedButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const router = useRouter();

  const handleInspect = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventory/inspection/divided", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dividedId: divided.id,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to inspect divided stock");
      }

      toast({
        title: "Stock Inspected",
        description: `Successfully inspected ${divided.rollNo}`,
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error inspecting divided stock:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to inspect divided stock",
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
        disabled={disabled || divided.inspected}
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        {divided.inspected ? "Inspected" : "Inspect"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspect Divided Stock</DialogTitle>
            <DialogDescription>
              You are about to inspect {divided.rollNo}. 
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