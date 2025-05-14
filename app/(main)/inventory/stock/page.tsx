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

export default withPermission(StockPage, "inventory", "read");

function StockPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useStockData();
  const [showForm, setShowForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockWithInspector | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();
  // Use the pre-initialized i18n instance
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  // Memoize the columns to avoid re-creation on each render
  const columns = useMemo(() => getColumns(t, router, undefined, () => mutate()), [t, router, mutate]);

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
    setIsDeleting(true);
    try {
      const response = await fetch("/api/inventory/stock", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete stock");
      }

      mutate();
      setSelectedRows([]);
      toast({
        title: t('common.success', 'Success'),
        description: t('inventory.stock.deleteSuccess', 'Selected stock items have been deleted.'),
      });
    } catch (error) {
      console.error("Error deleting stock:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.stock.deleteError', 'Failed to delete stock items. Please try again.'),
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
      format: [7, 5]  // Using the same size as divided page
    });

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (i > 0) {
        doc.addPage([7, 5], "landscape");
      }

      // Generate barcode image
      const barcodeImage = await new Promise<string>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 700;
        canvas.height = 500;

        // Use CODE128 format with same settings as divided page
        JsBarcode(canvas, stock.barcodeId, {
          format: "CODE128",
          width: 3,        // Wider bars
          height: 50,      // Taller bars
          displayValue: false,  // Don't show value
          fontSize: 0,     // No font size
          font: 'Arial',
          textMargin: 0,
          margin: 0
        });

        resolve(canvas.toDataURL('image/png'));
      });

      // Header text - same as divided page
      doc.setFontSize(11);
      doc.text(stock.type, 3.5, 0.7, { align: "center" });
      doc.text(`${stock.width} x ${stock.length} x ${stock.gsm}g`, 3.5, 1.2, { align: "center" });
      
      // Add barcode image - centered like in divided page
      doc.addImage(barcodeImage, 'PNG', 0.5, 1.6, 6, 2);
      
      // Add barcode ID below barcode like in divided page
      doc.setFontSize(10);
      doc.text(stock.barcodeId, 3.5, 4.3, { align: "center" });
    }

    doc.save("stock-labels.pdf");
  };

  // Add a column for "Status" that shows "Sold" or "Available"
  const stockColumns: ColumnDef<StockWithInspector>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => {
            table.toggleAllPageRowsSelected(e.target.checked);
            const ids = e.target.checked
              ? table.getRowModel().rows.map((row) => row.original.id)
              : [];
            setSelectedRows(ids);
          }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => {
            row.toggleSelected(e.target.checked);
            setSelectedRows((prev) =>
              e.target.checked
                ? [...prev, row.original.id]
                : prev.filter((id) => id !== row.original.id)
            );
          }}
        />
      ),
    },
    {
      accessorKey: "jumboRollNo",
      header: t('inventory.stock.jumboRollNo', 'Jumbo Roll No.'),
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "barcodeId",
      header: t('inventory.stock.barcodeId', 'Barcode ID'),
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: t('inventory.stock.type', 'Type'),
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "gsm",
      header: t('inventory.stock.gsm', 'GSM'),
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "width",
      header: t('inventory.stock.width', 'Width'),
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "length",
      header: t('inventory.stock.length', 'Length'),
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "remainingLength",
      header: t('inventory.stock.remainingLength', 'Remaining Length'),
      sortingFn: "basic",
      enableSorting: true,
      cell: ({ row }) => {
        const remainingLength = row.original.remainingLength || 0;
        
        if (remainingLength === 0) {
          return (
            <div className="text-red-500 font-medium">
              {remainingLength}m
            </div>
          );
        }
        
        if (remainingLength < 50) {
          return (
            <div className="flex items-center">
              <span>{remainingLength}m</span>
              <Badge variant="destructive" className="ml-2 text-xs">{t('inventory.stock.low', 'Low')}</Badge>
            </div>
          );
        }
        
        return <div>{remainingLength}m</div>;
      },
    },
    {
      accessorKey: "weight",
      header: t('inventory.stock.weight', 'Weight'),
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "containerNo",
      header: t('inventory.stock.containerNo', 'Container No.'),
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "arrivalDate",
      header: t('inventory.stock.arrivalDate', 'Arrival Date'),
      sortingFn: "datetime",
      enableSorting: true,
      cell: ({ row }) => format(new Date(row.original.arrivalDate), "PPP"),
    },
    {
      accessorKey: "inspector",
      header: t('inventory.stock.inspectedBy', 'Inspected by'),
      sortingFn: "alphanumeric",
      enableSorting: true,
      cell: ({ row }) => row.original.inspector?.name || "-",
    },
    // Add order information for sold stock
    {
      accessorKey: "orderDetails",
      header: t('inventory.stock.orderInfo', 'Order Info'),
      enableSorting: false,
      cell: ({ row }) => {
        const stock = row.original;
        return stock.isSold && stock.orderNo ? (
          <div className="text-xs">
            <div>{t('inventory.stock.order', 'Order')}: {stock.orderNo}</div>
            <div>{t('inventory.stock.date', 'Date')}: {stock.soldDate ? format(new Date(stock.soldDate), "PPP") : "-"}</div>
            <div>{t('inventory.stock.customer', 'Customer')}: {stock.customerName || "-"}</div>
          </div>
        ) : "-";
      },
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePrintLabel([row.original.id])}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setShowForm(true);
                    setSelectedStock(row.original);
                  }}
                >
                  {t('common.edit', 'Edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePrintLabel([row.original.id])}
                >
                  {t('inventory.stock.printLabel', 'Print Label')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDelete([row.original.id])}
                >
                  {t('common.delete', 'Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted || isLoading) {
    return <div>{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{t('inventory.stock.title', 'Stock Management')}</h1>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintLabel(selectedRows)}
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('inventory.stock.printLabels', 'Print Labels')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selectedRows)}
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
      )}
    </div>
  );
} 