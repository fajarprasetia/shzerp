"use client";

import { useState, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface InspectDividedButtonProps {
  divided: Divided;
  disabled?: boolean;
  onInspect?: () => void;
}

export function InspectDividedButton({ divided, disabled, onInspect }: InspectDividedButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const router = useRouter();
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        throw new Error(data.error || t('inventory.inspection.dividedInspectError', 'Failed to inspect divided stock'));
      }

      toast({
        title: t('inventory.inspection.dividedInspectedTitle', 'Divided Stock Inspected'),
        description: t('inventory.inspection.dividedInspectedDescription', 'Successfully inspected {{rollNo}}', { rollNo: divided.rollNo }),
      });

      setOpen(false);
      
      // Call the onInspect callback if provided for immediate UI update
      if (onInspect) {
        onInspect();
      } else {
        // Fall back to router.refresh() if no callback is provided
        router.refresh();
      }
    } catch (error) {
      console.error("Error inspecting divided stock:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('inventory.inspection.dividedInspectError', 'Failed to inspect divided stock'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled={true}>
        <ClipboardCheck className="h-4 w-4 mr-2" />
        {t('common.loading', 'Loading...')}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || divided.inspected}
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        {divided.inspected ? t('inventory.inspection.inspected', 'Inspected') : t('inventory.inspection.inspect', 'Inspect')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory.inspection.inspectDivided', 'Inspect Divided Stock')}</DialogTitle>
            <DialogDescription>
              {t('inventory.inspection.inspectDividedDescription', 'You are about to inspect divided roll {{rollNo}}. This action cannot be undone.', { rollNo: divided.rollNo })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Textarea
                placeholder={t('inventory.inspection.notePlaceholder', 'Add inspection notes (optional)')}
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
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleInspect}
              disabled={loading}
            >
              {loading ? t('inventory.inspection.inspecting', 'Inspecting...') : t('inventory.inspection.confirmInspection', 'Confirm Inspection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 