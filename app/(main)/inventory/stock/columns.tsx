"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StockWithInspector } from "@/hooks/use-stock-data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, Ruler, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { RemainingLengthForm } from "../components/remaining-length-form";
import { useToast } from "@/components/ui/use-toast";
import JsBarcode from "jsbarcode";

// Extend the interface to ensure it includes the inspector property
declare module "@/hooks/use-stock-data" {
  interface StockWithInspector {
    inspector?: {
      name: string;
    } | null;
  }
}

// Create a function that returns the columns with translations
// Accept t function and router as parameters
export const getColumns = (
  t: TFunction,
  router: any,
  renderActions?: (row: StockWithInspector) => React.ReactNode,
  onDataUpdate?: () => void
): ColumnDef<StockWithInspector>[] => {
  
  // Define the RemainingLengthPopover component inside getColumns to access t
  const RemainingLengthPopover = ({ stock }: { stock: StockWithInspector }) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const handleSuccess = () => {
      setOpen(false);
      toast({
        title: t('common.success', 'Success'),
        description: t('inventory.stock.remainingLengthUpdated', 'Remaining length has been updated successfully.'),
      });
      // Trigger data refresh
      if (onDataUpdate) {
        onDataUpdate();
      }
    };
    
    // Create a minimal stock object with only the properties needed by RemainingLengthForm
    const stockForForm = {
      id: stock.id,
      jumboRollNo: stock.jumboRollNo,
      length: stock.length,
      remainingLength: stock.remainingLength || 0,
      // Add other required fields with default values
      barcodeId: stock.barcodeId,
      type: stock.type,
      gsm: stock.gsm,
      width: stock.width,
      weight: stock.weight,
      containerNo: stock.containerNo,
      arrivalDate: stock.arrivalDate,
      isSold: false,
      note: '',
      status: 'AVAILABLE',
      inspected: false,
      inspectedById: '',
      inspectedAt: new Date(),
      orderNo: '',
      orderId: '',
      soldDate: null,
      customerName: '',
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt
    } as any; // Use type assertion to bypass TS checking
    
    const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen);
    };
    
    const handleClick = (e: React.MouseEvent) => {
      // Prevent the click from bubbling up to parent elements
      e.stopPropagation();
      // Toggle the popover state
      setOpen(true);
    };
    
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center w-full justify-start" 
            onClick={handleClick}
          >
            <Ruler className="h-4 w-4 mr-2" />
            {t('inventory.stock.editRemainingLength', 'Edit Remaining Length')}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0" 
          onInteractOutside={(e) => {
            // Prevent closing when clicked inside
            e.preventDefault();
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <RemainingLengthForm 
            stock={stockForForm} 
            onSuccess={handleSuccess} 
            onCancel={() => setOpen(false)} 
            inPopover={true}
          />
        </PopoverContent>
      </Popover>
    );
  };
  
  // Define a Barcode component
  const BarcodeDisplay = ({ barcodeId }: { barcodeId: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
      if (canvasRef.current && barcodeId) {
        try {
          JsBarcode(canvasRef.current, barcodeId, {
            format: "CODE128",
            width: 3,        // Increased bar width to match divided page
            height: 50,      // Increased bar height to match divided page
            displayValue: false, // Don't show the value directly on barcode
            fontSize: 0,     // No font size needed
            textMargin: 0,   // No text margin
            margin: 0        // No margin
          });
        } catch (error) {
          console.error("Error generating barcode:", error);
        }
      }
    }, [barcodeId]);
    
    return (
      <div className="flex flex-col items-center">
        <canvas ref={canvasRef} className="w-full" />
      </div>
    );
  };
  
  // Add a barcode print function
  const printBarcode = (stock: StockWithInspector) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print barcodes');
      return;
    }
    
    // Create a document with the same dimensions as in divided page.tsx
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${stock.barcodeId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10px;
            }
            .barcode-container {
              text-align: center;
              padding: 10px;
              width: 7cm;
              height: 5cm;
              border: 1px solid #ddd;
              margin-bottom: 10px;
              page-break-inside: avoid;
            }
            .header {
              text-align: center;
              font-size: 11pt;
              margin-bottom: 5px;
            }
            .details {
              font-size: 10px;
              margin-top: 5px;
              text-align: left;
            }
            canvas {
              max-width: 6cm;
              height: 2cm;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="header">
              ${stock.type}<br>
              ${stock.width} x ${stock.length} x ${stock.gsm}g
            </div>
            <canvas id="barcode"></canvas>
            <div class="footer">
              ${stock.barcodeId}
            </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#barcode", "${stock.barcodeId}", {
              format: "CODE128",
              width: 3,
              height: 50,
              displayValue: false,
              fontSize: 0,
              margin: 0
            });
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('common.selectAll', 'Select all')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('common.selectRow', 'Select row')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "jumboRollNo",
      header: t('inventory.stock.jumboRollNo', 'Jumbo Roll No.'),
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "barcodeId",
      header: t('inventory.stock.barcodeId', 'Barcode ID'),
      cell: ({ row }) => {
        const barcodeId = row.getValue("barcodeId") as string;
        return (
          <div className="flex flex-col gap-2">
            <BarcodeDisplay barcodeId={barcodeId} />
            <Button 
              variant="outline" 
              size="sm"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                printBarcode(row.original);
              }}
            >
              <Printer className="h-3 w-3 mr-1" />
              {t('inventory.stock.printSingle', 'Print')}
            </Button>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "type",
      header: t('inventory.stock.type', 'Type'),
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      id: "gsm",
      header: t('inventory.stock.gsm', 'GSM'),
      accessorFn: (row) => row.gsm?.toString() || '',
      cell: ({ row }) => row.original.gsm,
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      id: "width",
      header: t('inventory.stock.width', 'Width (mm)'),
      accessorFn: (row) => row.width?.toString() || '',
      cell: ({ row }) => row.original.width,
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      id: "length",
      header: t('inventory.stock.length', 'Length (mm)'),
      accessorFn: (row) => row.length?.toString() || '',
      cell: ({ row }) => row.original.length,
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "remainingLength",
      header: t('inventory.stock.remainingLength', 'Remaining (mm)'),
    },
    {
      accessorKey: "weight",
      header: t('inventory.stock.weight', 'Weight (kg)'),
    },
    {
      accessorKey: "containerNo",
      header: t('inventory.stock.containerNo', 'Container No.'),
    },
    {
      accessorKey: "arrivalDate",
      header: t('inventory.stock.arrivalDate', 'Arrival Date'),
      cell: ({ row }) => format(new Date(row.getValue("arrivalDate")), "dd/MM/yyyy"),
    },
    {
      accessorKey: "status",
      header: t('inventory.stock.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "AVAILABLE" ? "default" : "secondary"}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "inspector",
      header: t('inventory.stock.inspectedBy', 'Inspector'),
      cell: ({ row }) => {
        // Handle the case when inspector might not exist
        return row.original.inspector?.name || "-";
      },
    },
    {
      id: "actions",
      header: t('common.actions', 'Actions'),
      cell: ({ row }) => {
        if (renderActions) {
          return renderActions(row.original);
        }
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => router.push(`/inventory/stock/${row.original.id}/edit`)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t('common.edit', 'Edit')}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div onClick={(e) => e.stopPropagation()}>
                  <RemainingLengthPopover stock={row.original} />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm(t('inventory.stock.confirmDelete', 'Are you sure you want to delete this stock?'))) {
                    fetch(`/api/inventory/stock/${row.original.id}`, {
                      method: 'DELETE',
                    }).then(() => {
                      if (onDataUpdate) {
                        onDataUpdate();
                      } else {
                        window.location.reload();
                      }
                    });
                  }
                }}
                className="cursor-pointer text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('common.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}; 