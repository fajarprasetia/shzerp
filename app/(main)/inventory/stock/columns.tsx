"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StockWithInspector } from "@/hooks/use-stock-data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, Ruler, Printer, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { RemainingLengthForm } from "../components/remaining-length-form";
import { useToast } from "@/components/ui/use-toast";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Extend the interface to ensure it includes the inspector property
declare module "@/hooks/use-stock-data" {
  interface StockWithInspector {
    inspector?: {
      name: string;
    } | null;
  }
}

// Create a context for selected barcode IDs
const SelectedBarcodesContext = createContext<{
  selectedBarcodes: string[];
  setSelectedBarcodes: React.Dispatch<React.SetStateAction<string[]>>;
  printSelectedBarcodes: () => Promise<void>;
}>({
  selectedBarcodes: [],
  setSelectedBarcodes: () => {},
  printSelectedBarcodes: async () => {},
});

// Create a provider component
export const SelectedBarcodesProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const { toast } = useToast();

  // Function to print multiple barcodes as a single PDF
  const printSelectedBarcodes = async () => {
    if (selectedBarcodes.length === 0) return;

    // Fetch stock data for selected barcodes
    try {
      const response = await fetch(`/api/inventory/stock?ids=${selectedBarcodes.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch selected stock data');
      
      const stocks: StockWithInspector[] = await response.json();
      
      if (!stocks.length) {
        toast({
          title: "Error",
          description: "No stock items found for selected barcodes",
          variant: "destructive",
        });
        return;
      }

      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "cm",
        format: [7, 5]
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
      doc.save(`batch-barcodes-${dateStr}.pdf`);
      
      toast({
        title: "Success",
        description: `${stocks.length} barcodes have been downloaded as PDF`,
      });
      
      // Clear selection after printing
      setSelectedBarcodes([]);
    } catch (error) {
      console.error("Error printing batch barcodes:", error);
      toast({
        title: "Error",
        description: "Failed to generate barcode PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <SelectedBarcodesContext.Provider 
      value={{ selectedBarcodes, setSelectedBarcodes, printSelectedBarcodes }}
    >
      {children}
    </SelectedBarcodesContext.Provider>
  );
};

// Create a hook to use the context
export const useSelectedBarcodes = () => useContext(SelectedBarcodesContext);

// Create a BatchPrintButton component
export const BatchPrintButton = () => {
  const { selectedBarcodes, printSelectedBarcodes } = useSelectedBarcodes();
  const { t } = useTranslation();
  
  if (selectedBarcodes.length === 0) return null;
  
  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        printSelectedBarcodes();
      }}
      className="mb-4"
      size="sm"
    >
      <Printer className="h-4 w-4 mr-2" />
      {t('inventory.stock.printSelectedBarcodes', `Print ${selectedBarcodes.length} Selected Barcodes`)}
    </Button>
  );
};

// Filter components for different column types
export const FilterComponents = {
  // Text filter with input
  TextFilter: ({ column, t }: { column: any, t: TFunction }) => {
    const [value, setValue] = useState('');
    
    const onFilterChange = (value: string) => {
      setValue(value);
      column.setFilterValue(value);
    };
    
    return (
      <div className="p-2">
        <Label>{t('common.filter', 'Filter')}</Label>
        <Input
          placeholder={t('common.search', 'Search...')}
          value={value}
          onChange={(e) => onFilterChange(e.target.value)}
          className="mt-1"
        />
      </div>
    );
  },
  
  // Number range filter
  NumberRangeFilter: ({ column, t }: { column: any, t: TFunction }) => {
    const [min, setMin] = useState('');
    const [max, setMax] = useState('');
    
    const onMinChange = (value: string) => {
      const numericValue = value === '' ? undefined : parseFloat(value);
      setMin(value);
      const filterValue = column.getFilterValue() || {};
      column.setFilterValue({ ...filterValue, min: numericValue });
    };
    
    const onMaxChange = (value: string) => {
      const numericValue = value === '' ? undefined : parseFloat(value);
      setMax(value);
      const filterValue = column.getFilterValue() || {};
      column.setFilterValue({ ...filterValue, max: numericValue });
    };
    
    return (
      <div className="p-2 space-y-2">
        <Label>{t('common.filter', 'Filter')}</Label>
        <div className="flex items-center space-x-2">
          <Input
            placeholder={t('common.min', 'Min')}
            type="number"
            value={min}
            onChange={(e) => onMinChange(e.target.value)}
          />
          <span>-</span>
          <Input
            placeholder={t('common.max', 'Max')}
            type="number"
            value={max}
            onChange={(e) => onMaxChange(e.target.value)}
          />
        </div>
      </div>
    );
  },
  
  // Select filter with options
  SelectFilter: ({ column, options, t }: { column: any, options: {value: string, label: string}[], t: TFunction }) => {
    const [value, setValue] = useState('');
    
    const onValueChange = (newValue: string) => {
      setValue(newValue);
      column.setFilterValue(newValue === 'all' ? undefined : newValue);
    };
    
    return (
      <div className="p-2">
        <Label>{t('common.filter', 'Filter')}</Label>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t('common.selectOption', 'Select option')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
  
  // Date range filter
  DateRangeFilter: ({ column, t }: { column: any, t: TFunction }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const onStartDateChange = (value: string) => {
      setStartDate(value);
      const filterValue = column.getFilterValue() || {};
      column.setFilterValue({ ...filterValue, start: value || undefined });
    };
    
    const onEndDateChange = (value: string) => {
      setEndDate(value);
      const filterValue = column.getFilterValue() || {};
      column.setFilterValue({ ...filterValue, end: value || undefined });
    };
    
    return (
      <div className="p-2 space-y-2">
        <Label>{t('common.filter', 'Filter')}</Label>
        <div className="flex flex-col space-y-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            placeholder={t('common.startDate', 'Start date')}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            placeholder={t('common.endDate', 'End date')}
          />
        </div>
      </div>
    );
  },
};

// Create the columns with the checkbox component integrated with the context
// Pass selectedBarcodes and setSelectedBarcodes as parameters
export const getColumns = (
  t: TFunction,
  router: any,
  selectedBarcodes: string[],
  setSelectedBarcodes: (ids: string[]) => void,
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
  
  // Replace the existing printBarcode function with one that generates a PDF
  const printBarcode = async (stock: StockWithInspector) => {
    // Create a new PDF document with 7x5 cm dimensions
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "cm",
      format: [7, 5]
    });

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

    // Save the PDF with a descriptive name including the date
    const dateStr = format(new Date(), "yyyyMMdd-HHmmss");
    doc.save(`barcode-${stock.barcodeId}-${dateStr}.pdf`);
  };
  
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            
            // Update selected barcodes in the context when selecting/deselecting all
            if (value) {
              const allIds = table.getFilteredRowModel().rows.map(row => row.original.id);
              setSelectedBarcodes(allIds);
            } else {
              setSelectedBarcodes([]);
            }
          }}
          aria-label={t('common.selectAll', 'Select all')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
            
            // Update selected barcodes in the context
            if (value) {
              setSelectedBarcodes([...selectedBarcodes, row.original.id]);
            } else {
              setSelectedBarcodes(selectedBarcodes.filter(id => id !== row.original.id));
            }
          }}
          aria-label={t('common.selectRow', 'Select row')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "jumboRollNo",
      header: t('inventory.stock.jumboRollNo', 'Jumbo Roll No.'),
      filterFn: "includesString",
      enableColumnFilter: true,
      meta: {
        filterComponent: (column: any) => (
          <FilterComponents.TextFilter column={column} t={t} />
        ),
      },
    },
    {
      accessorKey: "barcodeId",
      header: t('inventory.stock.barcodeId', 'Barcode ID'),
      cell: ({ row }) => {
        const barcodeId = row.getValue("barcodeId") as string;
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <BarcodeDisplay barcodeId={barcodeId} />
            </div>
            <div className="text-center font-mono text-xs border border-dashed border-gray-200 dark:border-gray-700 py-1 px-2 rounded">
              {barcodeId}
            </div>
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
      filterFn: "includesString",
      enableColumnFilter: true,
      meta: {
        filterComponent: (column: any) => (
          <FilterComponents.TextFilter column={column} t={t} />
        ),
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.type', 'Type')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <FilterComponents.SelectFilter 
                  column={column} 
                  options={[
                    { value: 'Sublimation Paper', label: 'Sublimation Paper' },
                    { value: 'Transfer Paper', label: 'Transfer Paper' },
                    { value: 'Protection Paper', label: 'Protection Paper' }
                  ]}
                  t={t}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      filterFn: "equals",
      enableColumnFilter: true,
    },
    {
      id: "gsm",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.gsm', 'GSM')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto">
                <FilterComponents.NumberRangeFilter column={column} t={t} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      accessorFn: (row) => row.gsm || 0,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const gsm = row.getValue(columnId) as number;
        
        if (min !== undefined && max !== undefined) {
          return gsm >= min && gsm <= max;
        } else if (min !== undefined) {
          return gsm >= min;
        } else if (max !== undefined) {
          return gsm <= max;
        }
        return true;
      },
      enableColumnFilter: true,
    },
    {
      id: "width",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.width', 'Width (mm)')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto">
                <FilterComponents.NumberRangeFilter column={column} t={t} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      accessorFn: (row) => row.width || 0,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const width = row.getValue(columnId) as number;
        
        if (min !== undefined && max !== undefined) {
          return width >= min && width <= max;
        } else if (min !== undefined) {
          return width >= min;
        } else if (max !== undefined) {
          return width <= max;
        }
        return true;
      },
      enableColumnFilter: true,
    },
    {
      id: "length",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.length', 'Length (mm)')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto">
                <FilterComponents.NumberRangeFilter column={column} t={t} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      accessorFn: (row) => row.length || 0,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const length = row.getValue(columnId) as number;
        
        if (min !== undefined && max !== undefined) {
          return length >= min && length <= max;
        } else if (min !== undefined) {
          return length >= min;
        } else if (max !== undefined) {
          return length <= max;
        }
        return true;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "remainingLength",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.remainingLength', 'Remaining (mm)')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto">
                <FilterComponents.NumberRangeFilter column={column} t={t} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const remainingLength = row.getValue(columnId) as number;
        
        if (min !== undefined && max !== undefined) {
          return remainingLength >= min && remainingLength <= max;
        } else if (min !== undefined) {
          return remainingLength >= min;
        } else if (max !== undefined) {
          return remainingLength <= max;
        }
        return true;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "weight",
      header: t('inventory.stock.weight', 'Weight (kg)'),
    },
    {
      accessorKey: "containerNo",
      header: t('inventory.stock.containerNo', 'Container No.'),
      filterFn: "includesString",
      enableColumnFilter: true,
      meta: {
        filterComponent: (column: any) => (
          <FilterComponents.TextFilter column={column} t={t} />
        ),
      },
    },
    {
      accessorKey: "arrivalDate",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.arrivalDate', 'Arrival Date')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto">
                <FilterComponents.DateRangeFilter column={column} t={t} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      cell: ({ row }) => format(new Date(row.getValue("arrivalDate")), "dd/MM/yyyy"),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { start, end } = filterValue as { start?: string, end?: string };
        const date = row.getValue(columnId) as Date;
        const dateValue = new Date(date);
        
        if (start && end) {
          return dateValue >= new Date(start) && dateValue <= new Date(end);
        } else if (start) {
          return dateValue >= new Date(start);
        } else if (end) {
          return dateValue <= new Date(end);
        }
        return true;
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.stock.status', 'Status')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <FilterComponents.SelectFilter 
                  column={column} 
                  options={[
                    { value: 'AVAILABLE', label: 'Available' },
                    { value: 'RESERVED', label: 'Reserved' },
                    { value: 'PROCESSING', label: 'Processing' }
                  ]}
                  t={t}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "AVAILABLE" ? "default" : "secondary"}>
            {status}
          </Badge>
        );
      },
      filterFn: "equals",
      enableColumnFilter: true,
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