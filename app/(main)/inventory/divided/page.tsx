"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDividedData } from "@/hooks/use-divided-data";
import { DataTable } from "@/components/ui/data-table";
import { MoreVertical, Plus, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Divided, Stock } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddDividedStockDialog } from "../components/add-divided-stock-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
// Import pre-initialized i18n instance
import i18nInstance from "@/app/i18n";

// Update the interface to match what the API actually returns
interface DividedWithSoldInfo extends Divided {
  stock?: Stock;
  stockId: string;  
  inspectedBy?: {
    name: string;
  } | null;
  containerNo?: string;
  arrivalDate?: Date;
  inspector?: {
    name: string;
  } | null;
  // These fields are for sold items
  isSold: boolean;
  orderNo?: string;
  soldDate?: Date;
  customerName?: string;
  orderItemId?: string;
}

export default function DividedPage() {
  const { data: dividedData, mutate: mutateDivided } = useDividedData();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();
  // Use the pre-initialized i18n instance
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);

  // Effect to handle mounting and debug i18n state
  useEffect(() => {
    setMounted(true);
    
    // Log i18n state for debugging
    console.log('Divided page i18n state:', {
      language: i18n?.language,
      isInitialized: i18n?.isInitialized,
      availableLanguages: i18n?.languages || ['en', 'zh']
    });
  }, [i18n]);

  // Add initial sorting state to sort by rollNo by default
  const initialSorting = [
    {
      id: "rollNo",
      desc: false,
    },
  ];

  // Filter divided stock data based on active tab
  const filteredData = dividedData?.filter((divided) => {
    if (activeTab === "available") {
      return !divided.isSold;
    } else if (activeTab === "sold") {
      return divided.isSold;
    }
    return true;
  });

  const handleDeleteSelected = async () => {
    if (!selectedRows.length) return;

    if (!confirm(t('inventory.divided.confirmDelete', 'Are you sure you want to delete the selected items?'))) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/inventory/divided/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRows }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete items");
      }

      mutateDivided();
      setSelectedRows([]);
      toast({
        title: t('common.success', 'Success'),
        description: t('inventory.divided.deleteSuccess', '{{count}} items deleted successfully.', { count: selectedRows.length }),
      });
    } catch (error) {
      console.error("Error deleting items:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.divided.deleteError', 'Failed to delete items. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintLabel = (ids: string[]) => {
    const items = dividedData?.filter((item) => ids.includes(item.id));
    if (!items?.length) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [7, 5]
    });

    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage([7, 5], "landscape");
      }

      // Create barcode - make it larger and clearer
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, item.rollNo, {
        format: "CODE128",
        width: 3,        // Increased bar width
        height: 50,      // Increased bar height
        displayValue: false, // Show the value
        fontSize: 0,    // Larger font size
        textMargin: 0,   // More space for text
        margin: 0
      });

      // Header text - slightly smaller to make room for larger barcode
      doc.setFontSize(11);
      if (item.stockId !== "current" && item.stock) {
        doc.text(item.stock.type, 3.5, 0.7, { align: "center" });
        doc.text(`${item.width} x ${item.length} x ${item.stock.gsm}g`, 3.5, 1.2, { align: "center" });
      } else {
        doc.text(`${item.width} x ${item.length}`, 3.5, 1.0, { align: "center" });
      }
      
      // Add larger barcode and position it more centrally
      doc.addImage(canvas.toDataURL(), "PNG", 0.5, 1.6, 6, 2);
      
      // Add roll number below barcode if needed
      doc.setFontSize(10);
      doc.text(item.rollNo, 3.5, 4.3, { align: "center" });
    });

    doc.save("divided-labels.pdf");
  };

  const columns: ColumnDef<DividedWithSoldInfo>[] = [
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
      accessorKey: "rollNo",
      header: t('inventory.divided.rollNo', 'Roll No'),
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: t('inventory.divided.type', 'Type'),
      sortingFn: "alphanumeric",
      enableSorting: true,
      cell: ({ row }) => row.original.stockId === "current" ? t('inventory.divided.current', 'Current') : row.original.stock?.type || '-',
    },
    {
      accessorKey: "gsm",
      header: t('inventory.divided.gsm', 'GSM'),
      sortingFn: "basic",
      enableSorting: true,
      cell: ({ row }) => row.original.stockId === "current" ? "-" : row.original.stock?.gsm || '-',
    },
    {
      accessorKey: "containerNo",
      header: t('inventory.divided.containerNo', 'Container No'),
      sortingFn: "alphanumeric",
      enableSorting: true,
      cell: ({ row }) => row.original.containerNo || row.original.stock?.containerNo || "-",
    },
    {
      accessorKey: "arrivalDate",
      header: t('inventory.divided.arrivalDate', 'Arrival Date'),
      sortingFn: "datetime",
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.original.arrivalDate || row.original.stock?.arrivalDate;
        return date ? format(new Date(date), "dd/MM/yyyy") : "-";
      },
    },
    {
      accessorKey: "width",
      header: t('inventory.divided.width', 'Width'),
      sortingFn: "basic",
      enableSorting: true,
      cell: ({ row }) => `${row.original.width}mm`,
    },
    {
      accessorKey: "length",
      header: t('inventory.divided.length', 'Length'),
      sortingFn: "basic",
      enableSorting: true,
      cell: ({ row }) => `${row.original.length}m`,
    },
    {
      accessorKey: "weight",
      header: t('inventory.divided.weight', 'Weight'),
      sortingFn: "basic",
      enableSorting: true,
      cell: ({ row }) => row.original.weight ? `${row.original.weight}kg` : "-",
    },
    {
      accessorKey: "inspected",
      header: t('inventory.divided.inspected', 'Inspected'),
      sortingFn: "basic",
      enableSorting: true,
      cell: ({ row }) => row.original.inspected ? t('common.yes', 'Yes') : t('common.no', 'No'),
    },
    {
      accessorKey: "inspectedBy",
      header: t('inventory.divided.inspectedBy', 'Inspected by'),
      sortingFn: "alphanumeric",
      enableSorting: true,
      cell: ({ row }) => row.original.inspector?.name || row.original.inspectedBy?.name || "-",
    },
    // Add order information for sold stock
    {
      accessorKey: "orderDetails",
      header: t('inventory.divided.orderInfo', 'Order Info'),
      enableSorting: false,
      cell: ({ row }) => {
        const divided = row.original;
        return divided.isSold && divided.orderNo ? (
          <div className="text-xs">
            <div>{t('inventory.divided.order', 'Order')}: {divided.orderNo}</div>
            <div>{t('inventory.divided.date', 'Date')}: {divided.soldDate ? format(new Date(divided.soldDate), "PPP") : "-"}</div>
            <div>{t('inventory.divided.customer', 'Customer')}: {divided.customerName || "-"}</div>
          </div>
        ) : "-";
      },
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => (
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
                onClick={async () => {
                  if (confirm(t('inventory.divided.confirmDeleteItem', 'Are you sure you want to delete this item?'))) {
                    try {
                      const response = await fetch(`/api/inventory/divided/${row.original.id}`, {
                        method: "DELETE",
                      });
                      if (!response.ok) {
                        throw new Error("Failed to delete item");
                      }
                      mutateDivided();
                      toast({
                        title: t('common.success', 'Success'),
                        description: t('inventory.divided.deleteItemSuccess', 'Item deleted successfully'),
                      });
                    } catch (error) {
                      console.error("Error deleting item:", error);
                      toast({
                        title: t('common.error', 'Error'),
                        description: t('inventory.divided.deleteItemError', 'Failed to delete item'),
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                {t('common.delete', 'Delete')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePrintLabel([row.original.id])}
              >
                {t('inventory.divided.printLabel', 'Print Label')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div>{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('inventory.divided.title', 'Divided Stock Management')}</h1>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintLabel(selectedRows)}
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('inventory.divided.printLabels', 'Print Labels')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('inventory.divided.deleteSelected', 'Delete Selected')}
              </Button>
            </>
          )}
          <AddDividedStockDialog />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="available">{t('inventory.divided.availableStock', 'Available Stock')}</TabsTrigger>
          <TabsTrigger value="sold">{t('inventory.divided.soldStock', 'Sold Stock')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="w-full">
          <DataTable 
            columns={columns} 
            data={filteredData || []} 
            enableSorting={true}
            initialSorting={initialSorting}
            searchKey="rollNo"
          />
        </TabsContent>
        
        <TabsContent value="sold" className="w-full">
          <DataTable 
            columns={columns} 
            data={filteredData || []}
            enableSorting={true}
            initialSorting={initialSorting}
            searchKey="rollNo"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 