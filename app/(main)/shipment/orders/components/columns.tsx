"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";

// TFunction type for translation
type TFunction = any;

export type OrderToShipColumn = {
  id: string;
  orderNo: string;
  customer: string;
  customerPhone: string;
  address: string;
  items: number;
  date: string;
  action: React.ReactNode;
};

// Changed to a function that accepts translation function as parameter
export function getColumns(t: TFunction): ColumnDef<OrderToShipColumn>[] {
  return [
    {
      accessorKey: "orderNo",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 font-bold"
          >
            {t('sales.shipment.orders.orderNo', 'Order No')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: "customer",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 font-bold"
          >
            {t('sales.shipment.orders.customer', 'Customer')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span>{row.original.customer}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.customerPhone}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      header: t('sales.shipment.orders.address', 'Address'),
      cell: ({ row }) => {
        const address = row.original.address;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[200px] truncate">
                  {address || t('sales.shipment.orders.noAddress', 'No address provided')}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <p>{address || t('sales.shipment.orders.noAddress', 'No address provided')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "items",
      header: t('sales.shipment.orders.items', 'Items'),
      cell: ({ row }) => {
        return <div className="text-center">{row.original.items}</div>;
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="pl-0 font-bold"
          >
            {t('sales.shipment.orders.date', 'Date')}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => row.original.action,
    },
  ];
} 