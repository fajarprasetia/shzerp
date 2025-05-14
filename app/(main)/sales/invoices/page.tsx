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
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
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
  discount: number;
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
      // Fetch the latest invoice data from the API
      const response = await fetch(`/api/sales/invoices?include=orderItems,stock,divided`, {
        headers: { 'X-Debug-Mode': 'true' }
      });
      const invoices = await response.json();
      // Find the invoice by ID
      const latestInvoice = invoices.find((inv: any) => inv.id === invoice.id);
      if (!latestInvoice) {
        toast({
          title: t('common.error', 'Error'),
          description: 'Could not find latest invoice data.',
          variant: 'destructive',
        });
        return;
      }
      // Fetch customer data as before
      const customerResponse = await fetch(`/api/customers/${latestInvoice.customerId}`);
      if (!customerResponse.ok) {
        throw new Error(`Failed to fetch customer data: ${customerResponse.statusText}`);
      }
      const customer = await customerResponse.json();
      // Use latestInvoice for PDF generation
      if (!latestInvoice.orderItems || !Array.isArray(latestInvoice.orderItems)) {
        throw new Error('Invalid invoice data: Missing or invalid order items');
      }

      console.log('Raw invoice data:', {
        id: latestInvoice.id,
        orderNo: latestInvoice.invoiceNo,
        customerId: latestInvoice.customerId,
        orderItemsCount: latestInvoice.orderItems?.length || 0
      });

      console.log('Customer data:', customer);

      // Log each order item for debugging
      latestInvoice.orderItems.forEach((item, index) => {
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
        id: latestInvoice.orderId,
        orderNo: latestInvoice.invoiceNo,
        customerId: latestInvoice.customerId,
        orderItems: latestInvoice.orderItems.map((item: any) => ({
          ...item,
          // Ensure type, product, gsm are present as string
          type: item.type || '-',
          product: item.product || '-',
          gsm: item.gsm || '',
        })),
        totalAmount: latestInvoice.totalAmount,
        createdAt: new Date(latestInvoice.createdAt),
        discount: typeof latestInvoice.discount === 'number' ? latestInvoice.discount : 0
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
          total: item.price * item.quantity,
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
      
      // Force download the PDF
      const a = document.createElement('a');
      a.href = url;
      a.download = `${latestInvoice.invoiceNo || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
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

  // Create columns definition for the DataTable
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNo",
      header: t('sales.invoices.invoiceNo', 'Invoice No'),
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "customerName",
      header: t('sales.invoices.customer', 'Customer'),
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "totalAmount",
      header: t('sales.invoices.amount', 'Amount'),
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    {
      accessorKey: "paymentStatus",
      header: t('sales.invoices.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus") as string;
        return (
          <Badge
            variant={
              status === "PAID"
                ? "success"
                : "destructive"
            }
          >
            {status === "PAID" 
              ? t('sales.invoices.statuses.paid', 'Paid')
              : t('sales.invoices.statuses.pending', 'Pending')}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const searchValue = row.getValue(id)?.toString().toLowerCase() || '';
        return searchValue.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "createdAt",
      header: t('sales.invoices.createdAt', 'Created At'),
      cell: ({ row }) => {
        return row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleDateString()
          : "N/A";
      },
    },
    {
      id: "actions",
      header: t('common.actions', 'Actions'),
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div className="flex space-x-2">
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
          </div>
        );
      },
    },
  ];

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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <DataTable 
          columns={columns}
          data={invoices}
          searchableColumns={[
            { id: "invoiceNo", displayName: t('sales.invoices.invoiceNo', 'Invoice No') },
            { id: "customerName", displayName: t('sales.invoices.customer', 'Customer') },
            { id: "paymentStatus", displayName: t('sales.invoices.status', 'Status') }
          ]}
          enableSorting={true}
          noResults={
            <div className="text-center py-8">
              {error ? (
                <div className="text-destructive">{error}</div>
              ) : (
                t('sales.invoices.noInvoices', 'No invoices available')
              )}
            </div>
          }
        />
      )}

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