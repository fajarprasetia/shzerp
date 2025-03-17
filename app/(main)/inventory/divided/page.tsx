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
  const { toast } = useToast();

  const handleDeleteSelected = async () => {
    if (!selectedRows.length) return;

    if (!confirm("Are you sure you want to delete the selected items?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/inventory/divided/batch", {
        method: "DELETE",
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
        description: "Selected items deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting items:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete items",
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 sm:py-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Divided Stock Management</h1>
        <div className="flex flex-wrap gap-2">
          <AddDividedStockDialog />
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Selected"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePrintLabel(selectedRows)}
                className="whitespace-nowrap"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Labels
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <DataTable
          columns={columns}
          data={dividedData || []}
          searchKey="rollNo"
          onRowSelectionChange={setSelectedRows}
        />
      </div>
    </div>
  );
} 