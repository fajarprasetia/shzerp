import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@prisma/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreVertical, MoreHorizontal, FileText, Printer, FileSpreadsheet, FileImage, RefreshCcw, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderForm } from "./components/order-form";
import { useState } from "react";
import { OrderDetails } from "./components/order-details";

// Simplify to any function that takes a key and returns a string
type TFunction = any;

interface OrderWithRelations {
  id: string;
  orderNo: string;
  customerId: string;
  sales: string;
  type: string;
  totalAmount: number;
  tax: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    name: string;
    company: string;
  };
  orderItems: any[];
  note: string | null;
  paymentStatus: string | null;
  paymentImage: string | null;
  paymentMethod: string | null;
  reference: string | null;
  journalEntryId: string | null;
}

// Component for order view dialog 
export function OrderViewDialog({ 
  order, 
  open, 
  onOpenChange, 
  t 
}: { 
  order: OrderWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: TFunction;
}) {
  if (!order) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {t('sales.orders.viewOrder', 'Order Details')} - {order.orderNo}
          </DialogTitle>
        </DialogHeader>
        <OrderDetails order={order} />
      </DialogContent>
    </Dialog>
  );
}

// Modified to accept both translation function and toast as parameters
export function getColumns(
  t: TFunction, 
  toast: any,
  onEdit: (order: OrderWithRelations) => void,
  onView: (order: OrderWithRelations) => void
): ColumnDef<OrderWithRelations>[] {
  return [
    {
      accessorKey: "orderNo",
      header: t('sales.orders.orderNo', 'Order No.'),
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Button
            variant="ghost"
            className="hover:bg-transparent hover:underline"
            onClick={() => onView(order)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {order.orderNo}
          </Button>
        );
      },
    },
    {
      accessorKey: "customer",
      header: t('sales.orders.customer', 'Customer'),
      cell: ({ row }) => `${row.original.customer.name} - ${row.original.customer.company}`,
    },
    {
      accessorKey: "sales",
      header: t('sales.orders.sales', 'Sales'),
    },
    {
      accessorKey: "type",
      header: t('sales.orders.type', 'Type'),
    },
    {
      id: "itemCount",
      header: t('sales.orders.itemCount', 'Order Items'),
      cell: ({ row }) => row.original.orderItems.length,
    },
    {
      accessorKey: "totalAmount",
      header: t('sales.orders.totalAmount', 'Total Amount'),
      cell: ({ row }) => new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(row.original.totalAmount),
    },
    {
      accessorKey: "status",
      header: t('sales.orders.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variant = {
          PENDING: "warning",
          PROCESSING: "default",
          COMPLETED: "success",
          CANCELLED: "destructive",
        }[status] || "default";

        return (
          <Badge variant={variant as any}>
            {t(`sales.orders.statuses.${status.toLowerCase()}`, status)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;

        const handleGenerateInvoice = async () => {
          try {
            const response = await fetch(`/api/sales/orders/${order.id}/invoice`, {
              method: 'POST',
              headers: {
                'X-Debug-Mode': 'true'
              }
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to generate invoice');
            }

            toast({
              title: t('common.success', 'Success'),
              description: t('sales.orders.invoiceSuccess', 'Invoice generated successfully'),
              variant: "default"
            });
          } catch (error) {
            console.error('Error generating invoice:', error);
            toast({
              title: t('common.error', 'Error'),
              description: error instanceof Error ? error.message : t('sales.orders.invoiceError', 'Failed to generate invoice'),
              variant: "destructive"
            });
          }
        };

        // Check if order has been shipped by looking for shipment items
        const hasShipmentItems = order.orderItems?.some(item => item.shipmentItems?.length > 0);
        // Check if order status is PENDING
        const isPending = order.status === "PENDING";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(order)}>
                <Eye className="mr-2 h-4 w-4" />
                {t('common.view', 'View Details')}
              </DropdownMenuItem>
              {/* Only show Edit button if order is PENDING and hasn't been shipped */}
              {isPending && !hasShipmentItems && (
                <DropdownMenuItem onClick={() => onEdit(order)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common.edit', 'Edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleGenerateInvoice}>
                <FileText className="mr-2 h-4 w-4" />
                {t('sales.orders.generateInvoice', 'Generate Invoice')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('common.refresh', 'Refresh')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
} 