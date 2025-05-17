"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useDividedData, DividedWithSoldInfo as HookDividedWithSoldInfo } from "@/hooks/use-divided-data";
import { DataTable } from "@/components/ui/data-table";
import { MoreVertical, Plus, Trash2, Printer, Edit, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// Import pre-initialized i18n instance
import i18nInstance from "@/app/i18n";
import { InventoryLogsTable } from "../components/InventoryLogsTable";

// Use the interface from the hook with additional fields for our component
interface ExtendedDividedInfo extends HookDividedWithSoldInfo {
  stock?: {
    type: string;
    gsm: number;
    arrivalDate?: Date;
    containerNo?: string;
  };
  containerNo?: string;
  arrivalDate?: Date;
  inspector?: {
    name: string;
  } | null;
  orderItemId?: string;
}

export default function DividedPage() {
  const { data: dividedData, mutate: mutateDivided } = useDividedData();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const [isEditWidthDialogOpen, setIsEditWidthDialogOpen] = useState(false);
  const [selectedDivided, setSelectedDivided] = useState<ExtendedDividedInfo | null>(null);
  const [newWidth, setNewWidth] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  // Use the pre-initialized i18n instance
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = useState(false);
  // Add filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
  
  const handleEditWidth = (divided: ExtendedDividedInfo) => {
    setSelectedDivided(divided);
    setNewWidth(divided.width.toString());
    setIsEditWidthDialogOpen(true);
  };
  
  const handleSaveWidth = async () => {
    if (!selectedDivided || !newWidth) return;
    
    const numericWidth = parseFloat(newWidth);
    if (isNaN(numericWidth) || numericWidth <= 0) {
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.divided.invalidWidth', 'Please enter a valid width value greater than 0'),
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/inventory/divided/${selectedDivided.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          width: numericWidth
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update width');
      }
      
      // Update successful
      mutateDivided(); // Refresh data
      setIsEditWidthDialogOpen(false);
      toast({
        title: t('common.success', 'Success'),
        description: t('inventory.divided.widthUpdated', 'Width updated successfully'),
      });
    } catch (error) {
      console.error('Error updating width:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('inventory.divided.updateError', 'Failed to update width'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

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
      // Use optional chaining and provide fallbacks for potentially undefined properties
      if (item.stockId !== "current" && (item as ExtendedDividedInfo).stock) {
        const stockInfo = (item as ExtendedDividedInfo).stock;
        doc.text(stockInfo?.type || 'Unknown', 3.5, 0.7, { align: "center" });
        doc.text(`${item.width} x ${item.length} x ${stockInfo?.gsm || '?'}g`, 3.5, 1.2, { align: "center" });
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

  // Function to clear all filters
  const clearAllFilters = () => {
    setColumnFilters([]);
  };

  // Render active filters
  const renderActiveFilters = () => {
    if (columnFilters.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="text-sm font-medium mr-2 flex items-center">
          {t('common.activeFilters', 'Active filters:')}
        </div>
        {columnFilters.map((filter, index) => {
          let filterDisplay = '';
          if (typeof filter.value === 'string') {
            filterDisplay = filter.value;
          } else if (typeof filter.value === 'object') {
            if (filter.value.min !== undefined && filter.value.max !== undefined) {
              filterDisplay = `${filter.value.min} - ${filter.value.max}`;
            } else if (filter.value.min !== undefined) {
              filterDisplay = `≥ ${filter.value.min}`;
            } else if (filter.value.max !== undefined) {
              filterDisplay = `≤ ${filter.value.max}`;
            } else if (filter.value.start && filter.value.end) {
              filterDisplay = `${filter.value.start} - ${filter.value.end}`;
            }
          }
          
          return (
            <Badge key={index} variant="outline" className="flex items-center gap-1">
              <span>{filter.id}: {filterDisplay}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 p-0 rounded-full"
                onClick={() => {
                  const newFilters = columnFilters.filter((_, i) => i !== index);
                  setColumnFilters(newFilters);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs"
          onClick={clearAllFilters}
        >
          {t('common.clearAll', 'Clear all')}
        </Button>
      </div>
    );
  };

  const columns: ColumnDef<ExtendedDividedInfo, unknown>[] = [
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
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.divided.rollNo', 'Roll No')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <div className="p-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <Input
                    placeholder={t('common.search', 'Search...')}
                    value={(column.getFilterValue() as string) ?? ""}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "alphanumeric",
      enableSorting: true,
      filterFn: "includesString",
      enableColumnFilter: true,
    },
    {
      accessorKey: "type",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.divided.type', 'Type')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="p-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <Input
                    placeholder={t('common.search', 'Search...')}
                    value={(column.getFilterValue() as string) ?? ""}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "alphanumeric",
      enableSorting: true,
      filterFn: "includesString",
      enableColumnFilter: true,
      cell: ({ row }) => row.original.stockId === "current" ? t('inventory.divided.current', 'Current') : (row.original as ExtendedDividedInfo).stock?.type || '-',
    },
    {
      id: "gsm",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.divided.gsm', 'GSM')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <div className="p-2 space-y-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder={t('common.min', 'Min')}
                      type="number"
                      value={(column.getFilterValue() as any)?.min || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          min: val
                        }));
                      }}
                    />
                    <span>-</span>
                    <Input
                      placeholder={t('common.max', 'Max')}
                      type="number"
                      value={(column.getFilterValue() as any)?.max || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          max: val
                        }));
                      }}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "basic",
      enableSorting: true,
      accessorFn: (row) => row.stockId === "current" ? "" : row.stock?.gsm?.toString() || '',
      cell: ({ row }) => row.original.stockId === "current" ? "-" : (row.original as ExtendedDividedInfo).stock?.gsm || '-',
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const gsm = row.stock?.gsm;
        
        if (!gsm) return min === undefined; // If no GSM and min filter, exclude; if no min filter, include
        
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
      accessorKey: "containerNo",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.divided.containerNo', 'Container No')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="p-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <Input
                    placeholder={t('common.search', 'Search...')}
                    value={(column.getFilterValue() as string) ?? ""}
                    onChange={(e) => column.setFilterValue(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "alphanumeric",
      enableSorting: true,
      filterFn: "includesString",
      enableColumnFilter: true,
      cell: ({ row }) => (row.original as ExtendedDividedInfo).containerNo || (row.original as ExtendedDividedInfo).stock?.containerNo || "-",
    },
    {
      accessorKey: "arrivalDate",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.divided.arrivalDate', 'Arrival Date')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto">
                <div className="p-2 space-y-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <div className="flex flex-col space-y-2">
                    <Input
                      type="date"
                      value={(column.getFilterValue() as any)?.start || ""}
                      onChange={(e) => {
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          start: e.target.value || undefined
                        }));
                      }}
                      placeholder={t('common.startDate', 'Start date')}
                    />
                    <Input
                      type="date"
                      value={(column.getFilterValue() as any)?.end || ""}
                      onChange={(e) => {
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          end: e.target.value || undefined
                        }));
                      }}
                      placeholder={t('common.endDate', 'End date')}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "datetime",
      enableSorting: true,
      cell: ({ row }) => {
        const date = (row.original as ExtendedDividedInfo).arrivalDate || (row.original as ExtendedDividedInfo).stock?.arrivalDate;
        return date ? format(new Date(date), "dd/MM/yyyy") : "-";
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { start, end } = filterValue as { start?: string, end?: string };
        const date = (row.original as ExtendedDividedInfo).arrivalDate || (row.original as ExtendedDividedInfo).stock?.arrivalDate;
        
        if (!date) return !start && !end; // If no date and no filters, include it
        
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
      id: "width",
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>{t('inventory.divided.width', 'Width')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <div className="p-2 space-y-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder={t('common.min', 'Min')}
                      type="number"
                      value={(column.getFilterValue() as any)?.min || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          min: val
                        }));
                      }}
                    />
                    <span>-</span>
                    <Input
                      placeholder={t('common.max', 'Max')}
                      type="number"
                      value={(column.getFilterValue() as any)?.max || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          max: val
                        }));
                      }}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "basic",
      enableSorting: true,
      accessorFn: (row) => row.width.toString(),
      cell: ({ row }) => `${row.original.width}mm`,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const width = row.original.width;
        
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
            <span>{t('inventory.divided.length', 'Length')}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <div className="p-2 space-y-2">
                  <Label>{t('common.filter', 'Filter')}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder={t('common.min', 'Min')}
                      type="number"
                      value={(column.getFilterValue() as any)?.min || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          min: val
                        }));
                      }}
                    />
                    <span>-</span>
                    <Input
                      placeholder={t('common.max', 'Max')}
                      type="number"
                      value={(column.getFilterValue() as any)?.max || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        column.setFilterValue(old => ({
                          ...(old as object || {}),
                          max: val
                        }));
                      }}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      sortingFn: "basic",
      enableSorting: true,
      accessorFn: (row) => row.length.toString(),
      cell: ({ row }) => `${row.original.length}m`,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const { min, max } = filterValue as { min?: number, max?: number };
        const length = row.original.length;
        
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
      cell: ({ row }) => (row.original as ExtendedDividedInfo).inspector?.name || (row.original.inspectedById ? "User" : "-"),
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
            <div>{t('inventory.divided.customer', 'Customer')}: {(divided as ExtendedDividedInfo).customerName || "-"}</div>
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
                onClick={() => handleEditWidth(row.original)}
              >
                {t('inventory.divided.editWidth', 'Edit Width')}
              </DropdownMenuItem>
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
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="available">{t('inventory.divided.availableStock', 'Available Stock')}</TabsTrigger>
          <TabsTrigger value="sold">{t('inventory.divided.soldStock', 'Sold Stock')}</TabsTrigger>
          <TabsTrigger value="logs">{t('inventory.logs.title', 'Logs')}</TabsTrigger>
        </TabsList>
        
        {/* Render active filters */}
        {renderActiveFilters()}
        
        <TabsContent value="available" className="w-full">
          <DataTable 
            columns={columns} 
            data={filteredData || []} 
            enableSorting={true}
            initialSorting={initialSorting}
            enableColumnFilters={true}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            searchPlaceholder={t('inventory.divided.searchPlaceholder', 'Search divided stock...')}
          />
        </TabsContent>
        
        <TabsContent value="sold" className="w-full">
          <DataTable 
            columns={columns} 
            data={filteredData || []}
            enableSorting={true}
            initialSorting={initialSorting}
            enableColumnFilters={true}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            searchPlaceholder={t('inventory.divided.searchPlaceholder', 'Search divided stock...')}
          />
        </TabsContent>
        <TabsContent value="logs" className="w-full">
          <InventoryLogsTable itemType="divided" />
        </TabsContent>
      </Tabs>
      
      {/* Edit Width Dialog */}
      <Dialog open={isEditWidthDialogOpen} onOpenChange={setIsEditWidthDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('inventory.divided.editWidth', 'Edit Width')}</DialogTitle>
            <DialogDescription>
              {t('inventory.divided.editWidthDescription', 'Update the width for divided roll: ')} 
              {selectedDivided?.rollNo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="width" className="text-right">
                {t('inventory.divided.width', 'Width')}
              </Label>
              <Input
                id="width"
                type="number"
                step="0.01"
                min="1"
                value={newWidth}
                onChange={(e) => setNewWidth(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSaveWidth}
              disabled={isUpdating}
            >
              {isUpdating ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 