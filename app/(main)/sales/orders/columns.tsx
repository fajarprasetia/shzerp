import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@prisma/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MoreVertical, MoreHorizontal, FileText, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  discount: number | null;
  discountType: string | null;
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
        {/* Discount Section */}
        <div className="mt-4 flex flex-col gap-1 border-t pt-4">
          <div className="font-semibold">
            {t('sales.orders.discount', 'Discount')}
          </div>
          <div>
            {order.discount ? (
              <span>
                {order.discountType === 'value'
                  ? `Rp${Number(order.discount).toLocaleString('id-ID')}`
                  : `${order.discount}%`}
              </span>
            ) : (
              <span>-</span>
            )}
          </div>
        </div>
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
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      id: "customer",
      header: t('sales.orders.customer', 'Customer'),
      accessorFn: (row) => `${row.customer.name} - ${row.customer.company}`,
      cell: ({ row }) => `${row.original.customer.name} - ${row.original.customer.company}`,
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "sales",
      header: t('sales.orders.sales', 'Sales'),
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "type",
      header: t('sales.orders.type', 'Type'),
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      id: "itemCount",
      header: t('sales.orders.itemCount', 'Order Items'),
      cell: ({ row }) => row.original.orderItems.length,
    },
    {
      accessorKey: "discount",
      header: t('sales.orders.discount', 'Discount'),
      cell: ({ row }) => {
        const discount = row.original.discount;
        const discountType = row.original.discountType;
        if (!discount) return '-';
        return discountType === 'value'
          ? `Rp${Number(discount).toLocaleString('id-ID')}`
          : `${discount}%`;
      },
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
        const [showDateDialog, setShowDateDialog] = useState<null | 'generate'>(null);
        const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

            // Show different message based on whether invoice was created or updated
            const isUpdate = data.action === 'update';
            toast({
              title: t('common.success', 'Success'),
              description: isUpdate 
                ? t('sales.orders.invoiceUpdated', 'Invoice updated successfully') 
                : t('sales.orders.invoiceSuccess', 'Invoice generated successfully'),
              variant: "default"
            });
            setShowDateDialog(null);
            
            // Refresh the page to reflect changes
            window.location.reload();
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

        const handleDeleteOrder = async () => {
          try {
            setLoading(true);
            
            // Confirm user wants to proceed with cascade deletion
            const response = await fetch(`/api/sales/orders/${order.id}`, {
              method: 'DELETE'
            });
            
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || data.details || 'Failed to delete order');
            }
            
            const data = await response.json();

            toast({
              title: t('common.success', 'Success'),
              description: data.message || t('sales.orders.deleteSuccess', 'Order deleted successfully'),
              variant: "default"
            });
            
            // Refresh the page to show updated data
            window.location.reload();
          } catch (error) {
            console.error('Error deleting order:', error);
            toast({
              title: t('common.error', 'Error'),
              description: error instanceof Error ? error.message : t('sales.orders.deleteError', 'Failed to delete order'),
              variant: "destructive"
            });
          } finally {
            setLoading(false);
            setShowDeleteDialog(false);
          }
        };

        // Check if order has been shipped by looking for shipment items
        const hasShipmentItems = order.orderItems?.some(item => item.shipmentItems?.length > 0);
        // Check if order status is PENDING
        const isPending = order.status === "PENDING";
        // Check if the order has an invoice
        const hasInvoice = order.journalEntryId !== null;

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
              {/* Show Delete button for all orders */}
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            {/* Date Picker Dialog for Invoice Actions */}
            <Dialog open={!!showDateDialog} onOpenChange={open => { if (!open) setShowDateDialog(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t('sales.orders.selectInvoiceDate', 'Select Invoice Date')}
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
                    onClick={() => handleGenerateInvoice(selectedDate)}
                    disabled={loading}
                  >
                    {loading
                      ? t('common.loading', 'Loading...')
                      : t('sales.orders.generateInvoice', 'Generate Invoice')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDateDialog(null)} disabled={loading}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t('sales.orders.confirmDelete', 'Confirm Delete')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('sales.orders.deleteWarning', 
                      'Are you sure you want to delete this order? This will also delete all related records including invoices and shipments, and will revert any inventory changes. This action cannot be undone.')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteOrder}
                    disabled={loading}
                  >
                    {loading
                      ? t('common.loading', 'Loading...')
                      : t('common.delete', 'Delete')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={loading}>
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