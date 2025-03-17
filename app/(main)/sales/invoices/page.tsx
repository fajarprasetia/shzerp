"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Printer, Upload } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { generateInvoicePDF } from "./invoice-generator";
import { withPermission } from "@/app/components/with-permission";

interface Order {
  id: string;
  orderNo: string;
  customer: {
    name: string;
    address: string;
  };
  orderItems: Array<{
    id: string;
    price: number;
    quantity: number;
    tax: number;
    total: number;
    stock?: {
      gsm: number;
      width: number;
      type: string;
    } | null;
    divided?: {
      gsm: number;
      width: number;
      type: string;
    } | null;
  }>;
  totalAmount: number;
  paymentImage?: string;
  reference?: string;
  createdAt: Date;
  status?: string;
  paymentStatus?: string;
}

export default withPermission(InvoicesPage, "sales", "read");

function InvoicesPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadingOrderId, setUploadingOrderId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch orders data
  React.useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders data",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !uploadingOrderId) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", uploadingOrderId);

    setIsUploading(true);
    try {
      const response = await fetch("/api/upload-payment", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      
      // Refresh orders to get updated payment status
      await fetchOrders();

      toast({
        title: "Success",
        description: "Payment receipt uploaded successfully. Order marked as paid and journal entry created.",
      });
    } catch (error) {
      console.error("Error uploading payment:", error);
      toast({
        title: "Error",
        description: "Failed to upload payment receipt",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadingOrderId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePrint = async (order: Order) => {
    try {
      const pdf = await generateInvoicePDF(order);
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      });
    }
  };

  // Helper function to get payment image URL
  const getPaymentImageUrl = (order: Order): string | undefined => {
    // First check if paymentImage exists (for backward compatibility)
    if (order.paymentImage) {
      return order.paymentImage;
    }
    
    // Then check if reference exists and starts with /images/
    if (order.reference && order.reference.startsWith('/images/')) {
      return order.reference;
    }
    
    return undefined;
  };

  // Helper function to check if order is paid
  const isOrderPaid = (order: Order): boolean => {
    return order.paymentStatus === 'paid' || 
           order.status === 'paid' || 
           !!getPaymentImageUrl(order);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const paymentImageUrl = getPaymentImageUrl(order);
              const isPaid = isOrderPaid(order);
              
              return (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNo}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    {paymentImageUrl ? (
                      <div 
                        className="relative w-16 h-16 cursor-pointer border rounded-md overflow-hidden"
                        onClick={() => setSelectedImage(paymentImageUrl)}
                      >
                        <Image
                          src={paymentImageUrl}
                          alt="Payment receipt"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadingOrderId(order.id);
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          {isUploading && uploadingOrderId === order.id ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Add Payment
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isPaid ? "success" : "destructive"}>
                      {isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePrint(order)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Payment receipt image uploaded by customer
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-[70vh]">
              <Image
                src={selectedImage}
                alt="Payment receipt"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 