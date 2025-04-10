"use client";

import { ColumnDef } from "@tanstack/react-table";
import { StockWithInspector } from "@/hooks/use-stock-data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TFunction } from "i18next";

// Extend the interface to ensure it includes the inspector property
declare module "@/hooks/use-stock-data" {
  interface StockWithInspector {
    inspector?: {
      name: string;
    } | null;
  }
}

// Create a function that returns the columns with translations
// Accept t function as parameter instead of calling useTranslation inside
export const getColumns = (t: TFunction): ColumnDef<StockWithInspector>[] => {
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
    },
    {
      accessorKey: "barcodeId",
      header: t('inventory.stock.barcodeId', 'Barcode ID'),
    },
    {
      accessorKey: "type",
      header: t('inventory.stock.type', 'Type'),
    },
    {
      accessorKey: "gsm",
      header: t('inventory.stock.gsm', 'GSM'),
    },
    {
      accessorKey: "width",
      header: t('inventory.stock.width', 'Width (mm)'),
    },
    {
      accessorKey: "length",
      header: t('inventory.stock.length', 'Length (mm)'),
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
  ];
}; 