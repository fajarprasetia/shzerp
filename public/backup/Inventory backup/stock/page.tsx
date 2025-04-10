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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default withPermission(StockPage, "inventory", "read");

function StockPage() {
  const { data, isLoading, mutate } = useStockData();
  const [showForm, setShowForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockWithInspector | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();

  // Filter stock data based on active tab
  const filteredData = data?.filter((stock) => {
    if (activeTab === "available") {
      return !stock.isSold;
    } else if (activeTab === "sold") {
      return stock.isSold;
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
      header: "Jumbo Roll No.",
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "barcodeId",
      header: "Barcode ID",
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "type",
      header: "Type",
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "gsm",
      header: "GSM",
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "width",
      header: "Width",
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "length",
      header: "Length",
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "remainingLength",
      header: "Remaining Length",
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
              <Badge variant="destructive" className="ml-2 text-xs">Low</Badge>
            </div>
          );
        }
        
        return <div>{remainingLength}m</div>;
      },
    },
    {
      accessorKey: "weight",
      header: "Weight",
      sortingFn: "basic",
      enableSorting: true,
    },
    {
      accessorKey: "containerNo",
      header: "Container No.",
      sortingFn: "alphanumeric",
      enableSorting: true,
    },
    {
      accessorKey: "arrivalDate",
      header: "Arrival Date",
      sortingFn: "datetime",
      enableSorting: true,
      cell: ({ row }) => format(new Date(row.original.arrivalDate), "PPP"),
    },
    {
      accessorKey: "inspector",
      header: "Inspected by",
      sortingFn: "alphanumeric",
      enableSorting: true,
      cell: ({ row }) => row.original.inspector?.name || "-",
    },
    // Add order information for sold stock
    {
      accessorKey: "orderDetails",
      header: "Order Info",
      enableSorting: false,
      cell: ({ row }) => {
        const stock = row.original;
        return stock.isSold && stock.orderNo ? (
          <div className="text-xs">
            <div>Order: {stock.orderNo}</div>
            <div>Date: {stock.soldDate ? format(new Date(stock.soldDate), "PPP") : "-"}</div>
            <div>Customer: {stock.customerName || "-"}</div>
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
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePrintLabel([row.original.id])}
                >
                  Print Label
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDelete([row.original.id])}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="available">Available Stock</TabsTrigger>
            <TabsTrigger value="sold">Sold Stock</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="w-full">
            <DataTable 
              columns={stockColumns} 
              data={filteredData || []} 
              enableSorting={true}
            />
          </TabsContent>
          
          <TabsContent value="sold" className="w-full">
            <DataTable 
              columns={stockColumns} 
              data={filteredData || []} 
              enableSorting={true}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 