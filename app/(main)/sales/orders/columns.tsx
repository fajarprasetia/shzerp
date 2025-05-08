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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { OrderForm } from "./components/order-form";
import { useState } from "react";
import { OrderDetails } from "./components/order-details";
import { generateInvoicePDF } from "../invoices/invoice-generator";
import { Input } from "@/components/ui/input";

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
        const [showDateDialog, setShowDateDialog] = useState<null | 'generate' | 'print'>(null);
        const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
        const [loading, setLoading] = useState(false);

        const handleGenerateInvoice = async (dateOverride?: string) => {
          try {
            setLoading(true);
            const response = await fetch(`/api/sales/orders/${order.id}/invoice`, {
              method: 'POST',
              headers: {
                'X-Debug-Mode': 'true',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(dateOverride ? { invoiceDate: dateOverride } : undefined),
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
            setShowDateDialog(null);
          } catch (error) {
            console.error('Error generating invoice:', error);
            toast({
              title: t('common.error', 'Error'),
              description: error instanceof Error ? error.message : t('sales.orders.invoiceError', 'Failed to generate invoice'),
              variant: "destructive"
            });
          } finally {
            setLoading(false);
          }
        };

        const handlePrintInvoice = async (dateOverride?: string) => {
          try {
            setLoading(true);
            // Fetch the invoice for this order
            const res = await fetch(`/api/sales/invoices?orderId=${order.id}`);
            const invoices = await res.json();
            if (!Array.isArray(invoices) || invoices.length === 0) {
              toast({
                title: t('common.error', 'Error'),
                description: t('sales.orders.noInvoice', 'No invoice found for this order.'),
                variant: 'destructive',
              });
              return;
            }
            const invoice = invoices[0];
            // Use the same structure as generateInvoicePDF expects
            const pdfBuffer = await generateInvoicePDF({
              id: invoice.orderId,
              orderNo: invoice.order?.orderNo || invoice.invoiceNo.replace('INV-', ''),
              customerId: invoice.customerId,
              orderItems: invoice.orderItems,
              totalAmount: invoice.totalAmount,
              discount: invoice.discount || 0,
              createdAt: dateOverride ? new Date(dateOverride) : invoice.createdAt,
            });
            // Create a blob and open in new window
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setShowDateDialog(null);
          } catch (error) {
            toast({
              title: t('common.error', 'Error'),
              description: error instanceof Error ? error.message : t('sales.orders.printInvoiceError', 'Failed to print invoice'),
              variant: 'destructive',
            });
          } finally {
            setLoading(false);
          }
        };

        // Check if order has been shipped by looking for shipment items
        const hasShipmentItems = order.orderItems?.some(item => item.shipmentItems?.length > 0);
        // Check if order status is PENDING
        const isPending = order.status === "PENDING";

        return (
          <>
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
                <DropdownMenuItem onClick={() => setShowDateDialog('generate')}>
                <FileText className="mr-2 h-4 w-4" />
                {t('sales.orders.generateInvoice', 'Generate Invoice')}
              </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDateDialog('print')}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t('sales.orders.printInvoice', 'Print Invoice')}
                </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('common.refresh', 'Refresh')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            {/* Date Picker Dialog for Invoice Actions */}
            <Dialog open={!!showDateDialog} onOpenChange={open => { if (!open) setShowDateDialog(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {showDateDialog === 'generate'
                      ? t('sales.orders.selectInvoiceDate', 'Select Invoice Date')
                      : t('sales.orders.selectPrintDate', 'Select Print Date')}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                  <label htmlFor="invoice-date">{t('sales.orders.invoiceDate', 'Invoice Date')}</label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    disabled={loading}
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (showDateDialog === 'generate') handleGenerateInvoice(selectedDate);
                      else if (showDateDialog === 'print') handlePrintInvoice(selectedDate);
                    }}
                    disabled={loading}
                  >
                    {loading
                      ? t('common.loading', 'Loading...')
                      : showDateDialog === 'generate'
                        ? t('sales.orders.generateInvoice', 'Generate Invoice')
                        : t('sales.orders.printInvoice', 'Print Invoice')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDateDialog(null)} disabled={loading}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        );
      },
    },
  ];
} 