"use client";

import { useState } from "react";
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

export function AddDividedStockDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Divided Stock
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Divided Stock</DialogTitle>
            <DialogDescription>
              Choose how you want to add divided stock
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="current" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Current Stock</TabsTrigger>
              <TabsTrigger value="new">New from Stock</TabsTrigger>
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