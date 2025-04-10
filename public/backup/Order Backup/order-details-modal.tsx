"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrderDetailsModalProps {
  order: any; // We'll define a proper type later
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Order Details - {order.orderNo}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-y-auto">
          {/* Customer Information */}
          <div className="space-y-2">
            <h3 className="font-semibold">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p>{order.customer.company}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p>{order.customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp</p>
                <p>{order.customer.whatsapp}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p>{order.customer.address}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <h3 className="font-semibold">Order Items</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.orderItems.map((item: any) => {
                    const product = item.stock || item.divided;
                    const isJumboOrProtect = item.type === "Jumbo Roll" || item.type === "Protect Paper";
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {product?.gsm}g {item.type}
                        </TableCell>
                        <TableCell>
                          {isJumboOrProtect
                            ? `${product?.width || item.width}`
                            : `${product?.width || item.width}x${product?.length || item.length}`}
                        </TableCell>
                        <TableCell>
                          {isJumboOrProtect
                            ? `${product?.weight || item.weight || item.quantity}kg`
                            : `${item.quantity} Roll`}
                        </TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>{item.tax}%</TableCell>
                        <TableCell>{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p>{format(new Date(order.createdAt), "PPP")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p>{order.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
              </div>
              {order.note && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p>{order.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 