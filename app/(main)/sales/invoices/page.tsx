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
import { Printer, Upload, RefreshCw, MoreHorizontal, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { generateInvoicePDF } from "./invoice-generator";
import { withPermission } from "@/app/components/with-permission";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  tax: number;
  type?: string;
  gsm?: number;
  width?: number;
  length?: number;
  weight?: number;
  product?: string;
  stock?: {
    type: string;
    gsm: number;
    width: number;
    length?: number;
    weight?: number;
  } | null;
  divided?: {
    type: string;
    gsm: number;
    width: number;
    length?: number;
    weight?: number;
    stock?: {
      gsm: number;
      type: string;
    } | null;
  } | null;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  totalAmount: number;
  paymentStatus: "PAID" | "PENDING";
  paymentDate?: Date | null;
  paymentImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  orderItems: OrderItem[];
}

interface Order {
  id: string;
  orderNo: string;
  customer: {
    id: string;
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
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [uploadingInvoiceId, setUploadingInvoiceId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const [mounted, setMounted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize component and fetch data
  React.useEffect(() => {
    setMounted(true);
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching invoices from API...");
      
      const response = await fetch('/api/sales/invoices?include=orderItems,stock,divided', {
        headers: {
          'X-Debug-Mode': 'true'
        }
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Error response from API:", errorData || "Could not parse error response");
        
        if (errorData && errorData.error === 'Unauthorized') {
          // Handle authentication error
          window.location.href = '/auth/login';
          return;
        }
        
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorData?.details || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log("Invoices data received:", typeof data, Array.isArray(data) ? data.length : 'not an array');
      
      if (Array.isArray(data)) {
        // Transform the data to ensure orderItems is properly structured
        const processedInvoices = data.map(invoice => {
          console.log(`Processing invoice ${invoice.invoiceNo}:`, {
            hasOrder: !!invoice.order,
            orderItemsFromAPI: invoice.orderItems?.length || 0,
            orderItemsFromOrder: invoice.order?.orderItems?.length || 0
          });
            
          // Combine orderItems from both sources if available
          let orderItems = [];
          
          // If the API already provided orderItems directly on the invoice, use those
          if (Array.isArray(invoice.orderItems) && invoice.orderItems.length > 0) {
            orderItems = invoice.orderItems;
          } 
          // Otherwise try to get them from the order relationship
          else if (invoice.order && Array.isArray(invoice.order.orderItems)) {
            orderItems = invoice.order.orderItems;
          }
          
          console.log(`Final order items count for invoice ${invoice.invoiceNo}:`, orderItems.length);
          
          return {
            ...invoice,
            orderItems: orderItems,
            order: undefined // Remove the order object since we've extracted orderItems
          };
        });

        console.log("Processed invoices:", processedInvoices.map(inv => ({
          id: inv.id,
          orderItemsCount: inv.orderItems.length
        })));

        setInvoices(processedInvoices);
        toast({
          title: t('common.success', 'Success'),
          description: `Loaded ${data.length} invoices successfully`,
        });
      } else {
        console.error("Invalid response format:", data);
        toast({
          title: t('common.error', 'Error'),
          description: "Received invalid data format from server", 
          variant: "destructive",
        });
        setError("Invalid response format: expected an array of invoices");
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error ? error.message : "Failed to fetch invoices",
        variant: "destructive", 
      });
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const syncInvoicesFromOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sales/invoices/sync", {
        method: "POST",
        headers: {
          'X-Debug-Mode': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to sync invoices from orders");
      }
      
      const result = await response.json();
      
      toast({
        title: t('common.success', 'Success'),
        description: t('sales.invoices.syncSuccess', `Invoices synchronized successfully (${result.count || 0} created)`),
      });
      
      // Refresh invoices after manual sync
      await fetchInvoices();
      
      return true;
    } catch (error) {
      console.error("Error syncing invoices:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('sales.invoices.syncError', 'Failed to sync invoices from orders'),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !uploadingInvoiceId) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("invoiceId", uploadingInvoiceId);

    setIsUploading(true);
    try {
      const response = await fetch("/api/sales/invoices/upload-payment", {
        method: "POST",
        headers: {
          'X-Debug-Mode': 'true'
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload payment proof");
      }

      toast({
        title: t('common.success', 'Success'),
        description: t('sales.invoices.uploadSuccess', 'Payment proof uploaded successfully'),
      });

      fetchInvoices();
      setUploadingInvoiceId(null);
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error 
          ? error.message 
          : t('sales.invoices.uploadError', 'Failed to upload payment proof'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = (invoiceId: string) => {
    setUploadingInvoiceId(invoiceId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePrint = async (invoice: Invoice) => {
    try {
      if (!invoice || !invoice.customerId) {
        throw new Error('Invalid invoice data: Missing customer ID');
      }

      console.log('Raw invoice data:', {
        id: invoice.id,
        orderNo: invoice.invoiceNo,
        customerId: invoice.customerId,
        orderItemsCount: invoice.orderItems?.length || 0
      });

      // First fetch the customer data
      const customerResponse = await fetch(`/api/customers/${invoice.customerId}`);
      if (!customerResponse.ok) {
        throw new Error(`Failed to fetch customer data: ${customerResponse.statusText}`);
      }
      const customer = await customerResponse.json();

      console.log('Customer data:', customer);

      if (!invoice.orderItems || !Array.isArray(invoice.orderItems)) {
        console.error('Invalid order items:', invoice.orderItems);
        throw new Error('Invalid invoice data: Missing or invalid order items');
      }

      // Log each order item for debugging
      invoice.orderItems.forEach((item, index) => {
        console.log(`Order item ${index + 1} details:`, {
          id: item.id,
          stockType: item.stock?.type,
          price: item.price,
          quantity: item.quantity,
          tax: item.tax,
          hasStock: !!item.stock,
          hasDivided: !!item.divided
        });
      });

      // Convert invoice to the format expected by the PDF generator
      const orderForPDF = {
        id: invoice.orderId,
        orderNo: invoice.invoiceNo,
        customerId: invoice.customerId,
        orderItems: invoice.orderItems.map(item => {
          // For stock items, use the type directly
          let itemType = "Unknown";
          let productType = "Unknown";
          let gsm = 0;

          if (item.stock) {
            // Stock has a type field
            itemType = item.stock.type || "Unknown";
            gsm = item.stock.gsm;
            
            // Use the product type directly as provided in the order
            if (item.type === "Sublimation Paper") {
              // If no explicit product type is given, try to determine it from characteristics
              productType = item.product || (item.stock.weight ? "Jumbo Roll" : "Roll");
            } else {
              productType = item.type || "Unknown";
            }
          } else if (item.divided) {
            // For divided items, determine type from related properties
            itemType = "Sublimation Paper"; // Default for divided items
            
            // Use the product type directly as provided in the order 
            productType = item.product || "Roll"; // Default to Roll if not specified
            
            // Get GSM directly from the API response using type assertion
            // @ts-ignore: API adds gsm property
            gsm = item.gsm || 0;
            
            console.log(`Mapped divided item GSM:`, {
              itemId: item.id,
              productType,
              gsm,
              // @ts-ignore: API adds gsm property
              fromAPITransform: item.gsm
            });
          }

          // Calculate item total with tax
          const itemPrice = Number(item.price) || 0;
          const itemQuantity = Number(item.quantity) || 1;
          const itemTax = Number(item.tax) || 0;
          const itemTotal = itemPrice * itemQuantity * (1 + (itemTax / 100));

          const mappedItem = {
            id: item.id,
            type: itemType,
            product: productType,
            price: itemPrice,
            quantity: itemQuantity,
            tax: itemTax,
            gsm: gsm,
            // Directly use the values from the order item first before falling back to stock/divided
            width: Number(item.width) || Number(item.stock?.width || item.divided?.width || 0),
            length: Number(item.length) || Number(item.stock?.length || item.divided?.length || 0),
            weight: Number(item.weight) || Number(item.stock?.weight || item.divided?.weight || 0),
            total: itemTotal,
            stock: item.stock,
            divided: item.divided
          };

          console.log('Mapped order item:', {
            ...mappedItem,
            originalGSM: {
              fromStock: item.stock?.gsm,
              fromDivided: item.divided?.gsm
            }
          });
          return mappedItem;
        }),
        totalAmount: invoice.totalAmount,
        createdAt: new Date(invoice.createdAt)
      };
      
      console.log('Final PDF generation data:', { 
        orderNo: orderForPDF.orderNo,
        customerId: orderForPDF.customerId,
        itemCount: orderForPDF.orderItems.length,
        items: orderForPDF.orderItems.map(item => ({
          id: item.id,
          type: item.type,
          product: item.product,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
          gsm: item.gsm,
          width: item.width,
          length: item.length,
          weight: item.weight
        }))
      });

      const pdfBuffer = await generateInvoicePDF(orderForPDF);
      
      if (!pdfBuffer || pdfBuffer.byteLength === 0) {
        throw new Error('Generated PDF is empty');
      }

      console.log('PDF buffer size:', pdfBuffer.byteLength);
      
      // Create a blob from the PDF buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open the PDF in a new window
      window.open(url);
      
      toast({
        title: t('common.success', 'Success'),
        description: t('sales.invoices.pdfSuccess', 'Invoice PDF generated successfully'),
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: t('common.error', 'Error'),
        description: error instanceof Error 
          ? error.message 
          : t('sales.invoices.pdfError', 'Failed to generate invoice PDF'),
        variant: "destructive",
      });
    }
  };

  const getPaymentImageUrl = (invoice: Invoice): string => {
    if (!invoice.paymentImage) return "";

    // Check if it's already a full URL
    if (invoice.paymentImage.startsWith('http')) {
      return invoice.paymentImage;
    }

    // Construct the URL based on how your backend serves images
    return `/uploads/payments/${invoice.paymentImage}`;
  };

  const handleRefreshInvoices = async () => {
    await syncInvoicesFromOrders();
    fetchInvoices();
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-10">{t('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{t('sales.invoices.title', 'Invoice Management')}</h1>
        <div className="flex space-x-2">
          <Button onClick={() => fetchInvoices()} variant="outline" disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh', 'Refresh')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading}>
                <MoreHorizontal className="h-4 w-4" />
                {t('common.actions', 'Actions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRefreshInvoices}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('sales.invoices.manualSync', 'Force Sync with Orders')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                {t('common.print', 'Print List')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('sales.invoices.invoiceNo', 'Invoice No')}</TableHead>
              <TableHead>{t('sales.invoices.customer', 'Customer')}</TableHead>
              <TableHead>{t('sales.invoices.amount', 'Amount')}</TableHead>
              <TableHead>{t('sales.invoices.status', 'Status')}</TableHead>
              <TableHead>{t('sales.invoices.createdAt', 'Created At')}</TableHead>
              <TableHead>{t('common.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.paymentStatus === "PAID"
                          ? "success"
                          : "destructive"
                      }
                    >
                      {invoice.paymentStatus === "PAID" 
                        ? t('sales.invoices.statuses.paid', 'Paid')
                        : t('sales.invoices.statuses.pending', 'Pending')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.createdAt
                      ? new Date(invoice.createdAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(invoice)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      {t('sales.invoices.downloadPDF', 'Download PDF')}
                    </Button>
                    {invoice.paymentStatus !== "PAID" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUploadClick(invoice.id)}
                        disabled={isUploading && uploadingInvoiceId === invoice.id}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading && uploadingInvoiceId === invoice.id
                          ? t('common.loading', 'Uploading...')
                          : invoice.paymentImage
                          ? t('sales.invoices.replaceProof', 'Replace Proof')
                          : t('sales.invoices.uploadProof', 'Upload Proof')}
                      </Button>
                    )}
                    {invoice.paymentImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImage(getPaymentImageUrl(invoice) || null)}
                      >
                        {t('common.view', 'View')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {t('sales.invoices.noInvoices', 'No invoices available')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('sales.invoices.paymentProof', 'Payment Proof')}</DialogTitle>
            <DialogDescription>
              {t('sales.invoices.paymentProofDesc', 'View uploaded payment proof image')}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full h-auto max-h-[60vh] overflow-auto">
              <Image
                src={selectedImage}
                alt="Payment Proof"
                width={800}
                height={800}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 