'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui';
import { formatAddress, formatDate, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Clipboard, Download, Package, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { id } from "date-fns/locale";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/app/i18n';

// Shipment types
interface ShipmentItem {
  id: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  price: number;
  barcodes?: string[];
}

interface Shipment {
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  items: ShipmentItem[];
  createdAt: string;
  processedBy: {
    id: string;
    name: string;
  };
}

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  
  // Directly access the id from params
  const shipmentId = params.id;
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const fetchShipmentDetails = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/shipment/history/${shipmentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch shipment details');
        }
        
        const data = await response.json();
        setShipment(data.shipment);
        
      } catch (error) {
        console.error('Error fetching shipment details:', error);
        setError(t('sales.shipment.history.detail.loadError', 'Failed to load shipment details. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (mounted) {
      fetchShipmentDetails();
    }
  }, [shipmentId, mounted, t]);
  
  const handlePrintShippingLabel = () => {
    // This would typically open a print dialog with a shipping label
    toast({
      title: t('sales.shipment.history.detail.printFeature', 'Print feature'),
      description: t('sales.shipment.history.detail.printImplementation', 'Printing functionality would be implemented here.'),
    });
    
    // For demonstration, we'll open a new window with some basic shipment info
    if (shipment) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${t('sales.shipment.history.detail.shippingLabel', 'Shipping Label')} - ${shipment.orderNo}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .label { border: 1px solid #000; padding: 20px; max-width: 400px; }
                .header { text-align: center; margin-bottom: 20px; }
                .address { margin-bottom: 20px; }
                .barcode { text-align: center; font-family: monospace; font-size: 18px; margin: 20px 0; }
                /* Optional: styling to separate the two blocks */
                .ship-to, .from { margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="header">
                  <h2>${t('sales.shipment.history.detail.shippingLabel', 'SHIPPING LABEL')}</h2>
                  <p>${t('sales.shipment.document.orderNo', 'Order #')}: ${shipment.orderNo}</p>
                  <p>${t('sales.shipment.document.shipmentId', 'Shipment ID')}: ${shipment.id}</p>
                </div>
                <div class="address">
                  <div class="ship-to">
                    <h3>${t('sales.shipment.history.detail.to', 'Kepada')}:</h3>
                    <p>${shipment.customerName}</p>
                    <p>${shipment.customerPhone}</p>
                    <p>${shipment.address}</p>
                  </div>
                  <div class="from">
                    <h3>${t('sales.shipment.history.detail.from', 'Dari')}:</h3>
                    <p>SHUNHUI ZHIYE INDONESIA</p>
                    <p>0813-89-167167</p>
                    <p>Jl. Cibaligo No. 167</p>
                    <p>Kota Cimahi, Jawa Barat</p>
                  </div>
                </div>
                <div class="barcode">
                  ⚠ ${t('sales.shipment.history.detail.doNotDrop', 'JANGAN DIBANTING')} ⚠
                </div>
                <p>${t('sales.shipment.document.date', 'Tanggal')}: ${format(new Date(shipment.createdAt), "dd MMMM yyyy", { locale: id })}</p>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        
        printWindow.document.close();
      }
    }
  };
  
  const handleDownloadTravelDocument = () => {
    if (shipment) {
      // Open the travel document in a new tab
      window.open(`/api/shipment/travel-document/${shipment.id}`, '_blank');
    }
  };
  
  const handleCopyTrackingNumber = () => {
    if (shipment) {
      navigator.clipboard.writeText(shipment.id);
      toast({
        title: t('shipment.history.detail.trackingNumberCopied', 'Tracking number copied'),
        description: t('shipment.history.detail.trackingNumberCopiedDesc', 'The shipment ID has been copied to your clipboard.'),
      });
    }
  };
  
  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="container mx-auto py-6">{t('common.loading', 'Loading...')}</div>;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error || !shipment) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTitle>{t('common.error', 'Error')}</AlertTitle>
          <AlertDescription>
            {error || t('sales.shipment.history.detail.defaultError', 'Failed to load shipment details. Please try again later.')}
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => router.push('/shipment/history')}
        >
          {t('sales.shipment.history.detail.backToHistory', 'Back to Shipment History')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/shipment/history')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('sales.shipment.history.detail.backToHistory', 'Back to Shipment History')}
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{t('sales.shipment.history.detail.title', 'Shipment Details')}</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-muted-foreground">
              {t('sales.shipment.history.shipmentId', 'Shipment ID')}: {shipment.id}
            </p>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyTrackingNumber}
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={handlePrintShippingLabel}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t('sales.shipment.history.detail.printLabel', 'Print Label')}
          </Button>
          <Button 
            onClick={handleDownloadTravelDocument}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('sales.shipment.history.detail.travelDocument', 'Travel Document')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shipment Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t('shipment.history.detail.shipmentInformation', 'Shipment Information')}</CardTitle>
            <CardDescription>{t('shipment.history.detail.detailsAboutShipment', 'Details about this shipment')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">{t('sales.shipment.orders.orderNo', 'Order Number')}</h3>
              <p className="font-semibold">{shipment.orderNo}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">{t('sales.shipment.history.detail.processedOn', 'Processed On')}</h3>
              <p className="text-sm">{formatDateTime(shipment.createdAt)}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">{t('sales.shipment.history.processedBy', 'Processed By')}</h3>
              <p className="text-sm">{shipment.processedBy.name}</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">{t('sales.shipment.orders.customer', 'Customer')}</h3>
              <p className="font-semibold">{shipment.customerName}</p>
              <p className="text-sm text-muted-foreground">{shipment.customerEmail}</p>
              <p className="text-sm text-muted-foreground">{shipment.customerPhone}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">{t('sales.shipment.history.detail.shippingAddress', 'Shipping Address')}</h3>
              <p className="text-sm">{shipment.address}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Shipment Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('sales.shipment.history.detail.shippedItems', 'Shipped Items')}</CardTitle>
            <CardDescription>
              {t('sales.shipment.history.detail.itemsIncluded', 'Items included in this shipment')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sales.shipment.document.product', 'Product')}</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>{t('inventory.stock.barcodeId', 'Barcode')}</TableHead>
                  <TableHead className="text-right">{t('sales.shipment.document.quantity', 'Quantity')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipment.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>
                      {item.barcodes && item.barcodes.length > 0 ? (
                        <div className="space-y-1">
                          {item.barcodes.map((barcode, index) => (
                            <div key={index} className={index > 0 ? "text-xs text-muted-foreground" : ""}>
                              {barcode}
                            </div>
                          ))}
                        </div>
                      ) : (
                        item.barcode
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-6 text-right space-y-2">
              <div className="flex justify-end">
                <span className="font-medium mr-8">{t('sales.shipment.history.detail.totalItems', 'Total Items')}:</span>
                <span>{shipment.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 