"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Stock } from "@prisma/client";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RemainingLengthFormProps {
  stock: Stock;
  onSuccess: () => void;
  onCancel: () => void;
  inPopover?: boolean;
}

export function RemainingLengthForm({ stock, onSuccess, onCancel, inPopover = false }: RemainingLengthFormProps) {
  const [remainingLength, setRemainingLength] = useState(stock.remainingLength?.toString() || "0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/inventory/stock/${stock.id}/remaining-length`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remainingLength: parseFloat(remainingLength),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t('inventory.stock.updateError', 'Failed to update remaining length'));
      }

      if (!inPopover) {
        toast({
          title: t('common.success', 'Success'),
          description: t('inventory.stock.remainingLengthUpdated', 'Remaining length has been updated successfully.'),
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error updating remaining length:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : t('inventory.stock.updateError', 'Failed to update remaining length'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render a more compact form when displayed in a popover
  if (inPopover) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">
          {t('inventory.stock.editRemainingLength', 'Edit Remaining Length')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('inventory.stock.stock', 'Stock')}: <span className="font-medium">{stock.jumboRollNo}</span>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="originalLength" className="text-sm">
                {t('inventory.stock.originalLength', 'Original Length')}
              </Label>
              <span className="text-sm font-medium">{stock.length}mm</span>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="remainingLength" className="text-sm">
                {t('inventory.stock.remainingLength', 'Remaining Length (mm)')}
              </Label>
              <Input
                id="remainingLength"
                type="number"
                value={remainingLength}
                onChange={(e) => setRemainingLength(e.target.value)}
                required
                min="0"
                max={stock.length}
                step="any"
                className="h-8"
              />
              {parseFloat(remainingLength) > stock.length && (
                <p className="text-xs text-destructive mt-1">
                  {t('inventory.stock.remainingLengthTooLarge', 'Remaining length cannot be greater than original length')}
                </p>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {t('inventory.stock.usedLength', 'Used Length')}: {stock.length - parseFloat(remainingLength) || 0} mm
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              size="sm"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || parseFloat(remainingLength) > stock.length}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                t('common.save', 'Save')
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Default full-page form
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('inventory.stock.editRemainingLength', 'Edit Remaining Length')}</CardTitle>
        <CardDescription>
          {t('inventory.stock.editRemainingLengthDescription', 'Update the remaining length for stock item: ')} 
          <span className="font-semibold">{stock.jumboRollNo}</span>
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="originalLength">{t('inventory.stock.originalLength', 'Original Length')}</Label>
            <Input
              id="originalLength"
              value={stock.length}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="remainingLength">{t('inventory.stock.remainingLength', 'Remaining Length (mm)')}</Label>
            <Input
              id="remainingLength"
              type="number"
              value={remainingLength}
              onChange={(e) => setRemainingLength(e.target.value)}
              required
              min="0"
              max={stock.length}
              step="any"
            />
            {parseFloat(remainingLength) > stock.length && (
              <p className="text-sm text-destructive mt-1">
                {t('inventory.stock.remainingLengthTooLarge', 'Remaining length cannot be greater than original length')}
              </p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {t('inventory.stock.usedLength', 'Used Length')}: {stock.length - parseFloat(remainingLength) || 0} mm
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting || parseFloat(remainingLength) > stock.length}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('common.save', 'Save')
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 