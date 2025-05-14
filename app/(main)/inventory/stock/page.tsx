"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStockData, StockWithInspector } from "@/hooks/use-stock-data";
import { DataTable } from "@/components/ui/data-table";
import { MoreVertical, Plus, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Stock } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StockForm } from "../components/stock-form";
import { getColumns } from "./columns";
import { generateBarcode } from "@/lib/inventory";
import QRCode from "qrcode";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
// Import pre-initialized i18n instance
import i18nInstance from "@/app/i18n";
// Import the context provider and batch print button
import { SelectedBarcodesProvider, BatchPrintButton, useSelectedBarcodes } from "./columns";

export default withPermission(StockPage, "inventory", "read");

// Create a wrapper component to handle the context
function StockPageContent() {
  const router = useRouter();
  const { data, isLoading, mutate } = useStockData();
  const [showForm, setShowForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockWithInspector | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();
  // Use the pre-initialized i18n instance
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);
  
  // Get the selected barcodes from context
  const { selectedBarcodes, setSelectedBarcodes, printSelectedBarcodes } = useSelectedBarcodes();

  // Memoize the columns to avoid re-creation on each render - pass selectedBarcodes and setSelectedBarcodes
  const columns = useMemo(
    () => getColumns(t, router, selectedBarcodes, setSelectedBarcodes, undefined, () => mutate()), 
    [t, router, mutate, selectedBarcodes, setSelectedBarcodes]
  );

  // Effect to handle mounting and debug i18n state
  useEffect(() => {
    setMounted(true);
    
    // Log i18n state for debugging
    console.log('Stock page i18n state:', {
      language: i18n?.language,
      isInitialized: i18n?.isInitialized,
      availableLanguages: i18n?.languages || ['en', 'zh']
    });
  }, [i18n]);

  // Filter stock data based on active tab
  const filteredData = data?.filter((stock) => {
    if (activeTab === "available") {
      return !stock.isSold && stock.remainingLength > 0;
    } else if (activeTab === "sold") {
      return stock.isSold;
    } else if (activeTab === "stockout") {
      return !stock.isSold && stock.remainingLength === 0;
    }
    return true;
  });

  const handleSubmit = async (stockData: Stock) => {
    await mutate();
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(t('inventory.stock.confirmDelete', 'Are you sure you want to delete the selected items?'))) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/inventory/stock/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete items");
      }

      await mutate();
      toast({
        title: t('common.success', 'Success'),
        description: t('inventory.stock.deleteSuccess', 'Items deleted successfully'),
      });
    } catch (error) {
      console.error("Error deleting items:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.stock.deleteError', 'Failed to delete items'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintLabel = async (ids: string[]) => {
    const stocks = data?.filter((stock: StockWithInspector) => ids.includes(stock.id));
    if (!stocks?.length) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [7, 5]  // Exact 7x5 cm size as requested
    });

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (i > 0) {
        doc.addPage([7, 5], "landscape");
      }

      // Generate barcode image
      const barcodeImage = await new Promise<string>((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 700;
        canvas.height = 500;

        JsBarcode(canvas, stock.barcodeId, {
          format: "CODE128",
          width: 3,
          height: 50,
          displayValue: false,
          fontSize: 0,
          font: 'Arial',
          textMargin: 0,
          margin: 0
        });

        resolve(canvas.toDataURL('image/png'));
      });

      // Header text
      doc.setFontSize(11);
      doc.text(stock.type, 3.5, 0.7, { align: "center" });
      doc.text(`${stock.width} x ${stock.length} x ${stock.gsm}g`, 3.5, 1.2, { align: "center" });
      
      // Add barcode image - centered
      doc.addImage(barcodeImage, 'PNG', 0.5, 1.6, 6, 2);
      
      // Add barcode ID below barcode
      doc.setFontSize(10);
      doc.text(stock.barcodeId, 3.5, 4.3, { align: "center" });
    }

    // Save the PDF with a descriptive name including the date
    const dateStr = format(new Date(), "yyyyMMdd-HHmmss");
    doc.save(`stock-labels-${dateStr}.pdf`);
    
    toast({
      title: t('common.success', 'Success'),
      description: t('inventory.stock.barcodesPrinted', `${stocks.length} barcodes have been generated and downloaded.`),
    });
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted || isLoading) {
    return <div>{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{t('inventory.stock.title', 'Stock Management')}</h1>
        <div className="flex items-center gap-2">
          {selectedBarcodes.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={printSelectedBarcodes}
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('inventory.stock.printLabels', `Print ${selectedBarcodes.length} Labels`)}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selectedBarcodes)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('inventory.stock.deleteSelected', 'Delete Selected')}
              </Button>
            </>
          )}
          <Button onClick={() => setShowForm(true)}>{t('inventory.stock.addNew', 'Add New Stock')}</Button>
        </div>
      </div>

      {showForm ? (
        <StockForm 
          // @ts-ignore - Ignoring type errors due to compatibility issues between StockWithInspector and Stock
          initialData={selectedStock} 
          onSubmit={handleSubmit} 
          onCancel={handleCancel} 
        />
      ) : (
        <>
          {/* Add the BatchPrintButton here */}
          <div className="mb-4">
            <BatchPrintButton />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="available">{t('inventory.stock.availableStock', 'Available Stock')}</TabsTrigger>
              <TabsTrigger value="stockout">{t('inventory.stock.stockOut', 'Stock Out')}</TabsTrigger>
              <TabsTrigger value="sold">{t('inventory.stock.soldStock', 'Sold Stock')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="available" className="w-full">
              <DataTable 
                columns={columns}
                data={filteredData || []} 
                enableSorting={true}
                searchableColumns={[
                  { id: "jumboRollNo", displayName: t('inventory.stock.jumboRollNo', 'Jumbo Roll No.') },
                  { id: "barcodeId", displayName: t('inventory.stock.barcodeId', 'Barcode ID') },
                  { id: "type", displayName: t('inventory.stock.type', 'Type') },
                  { id: "gsm", displayName: t('inventory.stock.gsm', 'GSM') },
                  { id: "width", displayName: t('inventory.stock.width', 'Width') },
                  { id: "length", displayName: t('inventory.stock.length', 'Length') }
                ]}
              />
            </TabsContent>
            
            <TabsContent value="stockout" className="w-full">
              <DataTable 
                columns={columns}
                data={filteredData || []} 
                enableSorting={true}
                searchableColumns={[
                  { id: "jumboRollNo", displayName: t('inventory.stock.jumboRollNo', 'Jumbo Roll No.') },
                  { id: "barcodeId", displayName: t('inventory.stock.barcodeId', 'Barcode ID') },
                  { id: "type", displayName: t('inventory.stock.type', 'Type') },
                  { id: "gsm", displayName: t('inventory.stock.gsm', 'GSM') },
                  { id: "width", displayName: t('inventory.stock.width', 'Width') },
                  { id: "length", displayName: t('inventory.stock.length', 'Length') }
                ]}
              />
            </TabsContent>
            
            <TabsContent value="sold" className="w-full">
              <DataTable 
                columns={columns}
                data={filteredData || []} 
                enableSorting={true}
                searchableColumns={[
                  { id: "jumboRollNo", displayName: t('inventory.stock.jumboRollNo', 'Jumbo Roll No.') },
                  { id: "barcodeId", displayName: t('inventory.stock.barcodeId', 'Barcode ID') },
                  { id: "type", displayName: t('inventory.stock.type', 'Type') },
                  { id: "gsm", displayName: t('inventory.stock.gsm', 'GSM') },
                  { id: "width", displayName: t('inventory.stock.width', 'Width') },
                  { id: "length", displayName: t('inventory.stock.length', 'Length') }
                ]}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// The main component that ensures we're using the SelectedBarcodesProvider
function StockPage() {
  return (
    <SelectedBarcodesProvider>
      <StockPageContent />
    </SelectedBarcodesProvider>
  );
} 