"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { DividedStockForm } from "./divided-stock-form";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

export function AddDividedStockDialog() {
  const [open, setOpen] = useState(false);
  // Use the pre-initialized i18n instance
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return (
      <Button disabled>
        <Plus className="h-4 w-4 mr-2" />
        {t('common.loading', 'Loading...')}
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        {t('inventory.divided.addDividedStock', 'Add Divided Stock')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('inventory.divided.addDividedStock', 'Add Divided Stock')}</DialogTitle>
            <DialogDescription>
              {t('inventory.divided.chooseAddMethod', 'Choose how you want to add divided stock')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="current" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">{t('inventory.divided.currentStock', 'Current Stock')}</TabsTrigger>
              <TabsTrigger value="new">{t('inventory.divided.newFromStock', 'New from Stock')}</TabsTrigger>
            </TabsList>
            <TabsContent value="current">
              <DividedStockForm mode="current" onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="new">
              <DividedStockForm mode="new" onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
} 