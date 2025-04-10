"use client";

import { useState } from "react";
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

interface DividedWithStock extends Divided {
  stock: Stock;
  inspectedBy: {
    name: string;
  } | null;
  containerNo?: string;
  arrivalDate?: Date;
  inspector?: {
    name: string;
  } | null;
}

export default function DividedPage() {
  const { data: dividedData, mutate: mutateDivided } = useDividedData();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();

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

    if (!confirm("Are you sure you want to delete the selected items?")) return;

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
        title: "Success",
        description: `${selectedRows.length} items deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting items:", error);
      toast({
        title: "Error",
        description: "Failed to delete items. Please try again.",
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

      // Create barcode
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, item.rollNo, {
        format: "CODE128",
        width: 2,
        height: 30,
        displayValue: false
      });

      // Add content
      doc.setFontSize(12);
      if (item.stockId !== "current") {
        doc.text(item.stock.type, 3.5, 1, { align: "center" });
        doc.text(`${item.width} x ${item.length} x ${item.stock.gsm}g`, 3.5, 1.8, { align: "center" });
      } else {
        doc.text(`${item.width} x ${item.length}`, 3.5, 1.8, { align: "center" });
      }
      
      // Add barcode
      doc.addImage(canvas.toDataURL(), "PNG", 1, 2, 5, 1.5);
      
      // Add roll number
      doc.setFontSize(10);
      doc.text(item.rollNo, 3.5, 4.5, { align: "center" });
    });

    doc.save("divided-labels.pdf");
  };

  const columns: ColumnDef<DividedWithStock>[] = [
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
      header: "Roll No",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => row.original.stockId === "current" ? "Current" : row.original.stock.type,
    },
    {
      accessorKey: "gsm",
      header: "GSM",
      cell: ({ row }) => row.original.stockId === "current" ? "-" : row.original.stock.gsm,
    },
    {
      accessorKey: "containerNo",
      header: "Container No",
      cell: ({ row }) => row.original.containerNo || row.original.stock?.containerNo || "-",
    },
    {
      accessorKey: "arrivalDate",
      header: "Arrival Date",
      cell: ({ row }) => {
        const date = row.original.arrivalDate || row.original.stock?.arrivalDate;
        return date ? format(new Date(date), "dd/MM/yyyy") : "-";
      },
    },
    {
      accessorKey: "width",
      header: "Width",
      cell: ({ row }) => `${row.original.width}mm`,
    },
    {
      accessorKey: "length",
      header: "Length",
      cell: ({ row }) => `${row.original.length}m`,
    },
    {
      accessorKey: "weight",
      header: "Weight",
      cell: ({ row }) => row.original.weight ? `${row.original.weight}kg` : "-",
    },
    {
      accessorKey: "inspected",
      header: "Inspected",
      cell: ({ row }) => row.original.inspected ? "Yes" : "No",
    },
    {
      accessorKey: "inspectedBy",
      header: "Inspected by",
      cell: ({ row }) => row.original.inspector?.name || row.original.inspectedBy?.name || "-",
    },
    // Add order information for sold stock
    {
      accessorKey: "orderDetails",
      header: "Order Info",
      cell: ({ row }) => {
        const divided = row.original;
        return divided.isSold && divided.orderNo ? (
          <div className="text-xs">
            <div>Order: {divided.orderNo}</div>
            <div>Date: {divided.soldDate ? format(new Date(divided.soldDate), "PPP") : "-"}</div>
            <div>Customer: {divided.customerName || "-"}</div>
          </div>
        ) : "-";
      },
    },
    {
      id: "actions",
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
                  if (confirm("Are you sure you want to delete this item?")) {
                    try {
                      const response = await fetch(`/api/inventory/divided/${row.original.id}`, {
                        method: "DELETE",
                      });
                      if (!response.ok) {
                        throw new Error("Failed to delete item");
                      }
                      mutateDivided();
                      toast({
                        title: "Success",
                        description: "Item deleted successfully",
                      });
                    } catch (error) {
                      console.error("Error deleting item:", error);
                      toast({
                        title: "Error",
                        description: "Failed to delete item",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePrintLabel([row.original.id])}
              >
                Print Label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Divided Stock Management</h1>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintLabel(selectedRows)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Labels
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </>
          )}
          <AddDividedStockDialog />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="available">Available Stock</TabsTrigger>
          <TabsTrigger value="sold">Sold Stock</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="w-full">
          <DataTable columns={columns} data={filteredData || []} />
        </TabsContent>
        
        <TabsContent value="sold" className="w-full">
          <DataTable columns={columns} data={filteredData || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 