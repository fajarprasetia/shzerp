"use client";

import { useState, useEffect } from "react";
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
import { columns } from "./columns";
import { generateBarcode } from "@/lib/inventory";
import QRCode from "qrcode";
import { withPermission } from "@/app/components/with-permission";
import { PermissionGate } from "@/app/components/permission-gate";

export default withPermission(StockPage, "inventory", "read");

function StockPage() {
  const { data, isLoading, mutate } = useStockData();
  const [showForm, setShowForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockWithInspector | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

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
        title: "Success",
        description: "Selected stock items have been deleted.",
      });
    } catch (error) {
      console.error("Error deleting stock:", error);
      toast({
        title: "Error",
        description: "Failed to delete stock items. Please try again.",
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
      unit: "mm",
      format: [50, 25],
    });

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (i > 0) {
        doc.addPage([50, 25], "landscape");
      }

      // Generate barcode image
      const barcodeImage = await new Promise<string>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 300;
        canvas.height = 50;

        // Use CODE128 format for barcodes
        JsBarcode(canvas, stock.barcodeId, {
          format: "CODE128",
          width: 1,
          height: 30,
          displayValue: true,
          fontSize: 8,
          font: 'Arial',
          textMargin: 2,
          margin: 0
        });

        resolve(canvas.toDataURL('image/png'));
      });

      // Add barcode image
      doc.addImage(barcodeImage, 'PNG', 2, 2, 46, 10);

      // Add text information below barcode
      doc.setFontSize(6);
      doc.text(`Type: ${stock.type}`, 2, 15);
      doc.text(`GSM: ${stock.gsm}`, 2, 18);
      doc.text(`Size: ${stock.width}x${stock.length}mm`, 2, 21);

      // Generate QR code
      const qrData = JSON.stringify({
        id: stock.id,
        jumboRollNo: stock.jumboRollNo,
        type: stock.type,
        gsm: stock.gsm,
        width: stock.width,
        length: stock.length,
        weight: stock.weight,
        containerNo: stock.containerNo,
        arrivalDate: stock.arrivalDate
      });

      // Use the Promise-based QRCode API
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 50,
        margin: 0,
        errorCorrectionLevel: 'L'
      });

      // Add small QR code to the right side
      doc.addImage(qrImage, 'PNG', 38, 13, 10, 10);
    }

    doc.save("stock-labels.pdf");
  };

  const columns = [
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
      header: "Jumbo Roll No.",
    },
    {
      accessorKey: "barcodeId",
      header: "Barcode ID",
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "gsm",
      header: "GSM",
    },
    {
      accessorKey: "width",
      header: "Width",
    },
    {
      accessorKey: "length",
      header: "Length",
    },
    {
      accessorKey: "weight",
      header: "Weight",
    },
    {
      accessorKey: "containerNo",
      header: "Container No.",
    },
    {
      accessorKey: "arrivalDate",
      header: "Arrival Date",
      cell: ({ row }) => format(new Date(row.original.arrivalDate), "PPP"),
    },
    {
      accessorKey: "inspector",
      header: "Inspected by",
      cell: ({ row }) => row.original.inspector?.name || "-",
    },
    {
      id: "actions",
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
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (confirm("Are you sure you want to delete this stock?")) {
                      try {
                        const response = await fetch(`/api/inventory/stock/${row.original.id}`, {
                          method: "DELETE",
                        });
                        if (!response.ok) {
                          throw new Error("Failed to delete stock");
                        }
                        mutate();
                        toast({
                          title: "Success",
                          description: "Stock deleted successfully",
                        });
                      } catch (error) {
                        console.error("Error deleting stock:", error);
                        toast({
                          title: "Error",
                          description: "Failed to delete stock",
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
        );
      },
    },
  ] as ColumnDef<StockWithInspector>[];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Stock Management</h1>
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
                onClick={() => handleDelete(selectedRows)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </>
          )}
          <Button onClick={() => setShowForm(true)}>Add New Stock</Button>
        </div>
      </div>

      {showForm ? (
        <StockForm 
          initialData={selectedStock || undefined} 
          onSubmit={handleSubmit} 
          onCancel={handleCancel} 
        />
      ) : (
        <DataTable columns={columns} data={data} />
      )}
    </div>
  );
} 