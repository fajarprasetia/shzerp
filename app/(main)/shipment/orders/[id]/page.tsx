'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui';
import { useOrderById, Order, OrderItem } from '@/app/hooks/use-shipment-orders';
import { LoadingSpinner } from '@/components/ui';
import { AlertCircle, CheckCircle, Truck, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";

// Type for tracking scanned items
interface ScannedItem {
  orderItemId: string;
  barcode: string;
  stockId?: string;
  dividedId?: string;
}

// Types for Order data
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function OrderShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = use(params);
  const { order, isLoading, error } = useOrderById(id);
  
  const [barcode, setBarcode] = useState<string>('');
  // Replace simple Set with Map to track multiple scans per item
  const [scannedBarcodes, setScannedBarcodes] = useState<Map<string, ScannedItem[]>>(new Map());
  const [processingShipment, setProcessingShipment] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    matched: boolean;
    message: string;
    item?: any;
    inventoryItem?: any;
    isStockItem?: boolean;
  } | null>(null);
  const [shipmentNotes, setShipmentNotes] = useState("");

  // Helper function to calculate total scanned items
  const getTotalScannedCount = () => {
    let count = 0;
    scannedBarcodes.forEach(scans => {
      count += scans.length;
    });
    return count;
  };

  // Helper function to calculate total required items
  const getTotalRequiredCount = () => {
    if (!order) return 0;
    return order.orderItems.reduce((sum: number, item: OrderItem) => sum + (Number(item.quantity) || 1), 0);
  };

  // Check if all items have been sufficiently scanned based on quantity
  const allItemsFullyScanned = () => {
    if (!order) return false;
    return order.orderItems.every((item: OrderItem) => {
      const scannedCount = scannedBarcodes.get(item.id)?.length || 0;
      return scannedCount >= (Number(item.quantity) || 1);
    });
  };

  // Focus on barcode input when component loads
  useEffect(() => {
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      barcodeInput.focus();
    }
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barcode.trim() || !order) return;
    
    try {
      const response = await axios.post('/api/shipment/validate-barcode', {
        orderId: id,
        barcodeValue: barcode.trim(),
      });
      
      const result = response.data;
      
      setValidationResult(result);
      
      if (result.matched) {
        const orderItem = order.orderItems.find((item: OrderItem) => item.id === result.orderItem.id);
        const currentScans = scannedBarcodes.get(result.orderItem.id) || [];
        
        // Check if we already have enough scans for this item
        if (currentScans.length >= (Number(orderItem?.quantity) || 1)) {
          toast({
            title: 'Warning',
            description: `Already scanned sufficient items for this product. Required: ${orderItem?.quantity || 1}`,
          });
        } else {
          // Add the new scan to our tracking
          setScannedBarcodes(prev => {
            const updated = new Map(prev);
            if (!updated.has(result.orderItem.id)) {
              updated.set(result.orderItem.id, []);
            }
            
            // Check if this exact barcode was already scanned for this item
            const barcodeAlreadyScanned = updated.get(result.orderItem.id)?.some(
              scan => scan.barcode === barcode.trim()
            );
            
            if (!barcodeAlreadyScanned) {
              updated.get(result.orderItem.id)?.push({
                orderItemId: result.orderItem.id,
                barcode: barcode.trim(),
                stockId: result.inventoryItem.type === 'stock' ? result.inventoryItem.id : undefined,
                dividedId: result.inventoryItem.type === 'divided' ? result.inventoryItem.id : undefined
              });
            } else {
              toast({
                title: 'Duplicate Scan',
                description: 'This barcode has already been scanned for this item.',
              });
            }
            
            return updated;
          });
          
          const updatedScans = scannedBarcodes.get(result.orderItem.id)?.length || 0;
          toast({
            title: 'Item scanned successfully',
            description: `Scanned ${updatedScans + 1} of ${orderItem?.quantity || 1} required for this product.`,
          });
        }
      }
      
      // Clear barcode input
      setBarcode('');
      
      // Focus back on the input
      const barcodeInput = document.getElementById('barcode-input');
      if (barcodeInput) {
        barcodeInput.focus();
      }
      
    } catch (error) {
      console.error('Error validating barcode:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate barcode. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleProcessShipment = async () => {
    if (!order) return;
    
    // Check if all items have been scanned according to their quantities
    if (!allItemsFullyScanned()) {
      toast({
        title: 'Cannot process shipment',
        description: 'Not all required items have been scanned. Please scan all required items before processing.',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingShipment(true);
    
    // Prepare scanned items data for the API
    const allScannedItems: ScannedItem[] = [];
    scannedBarcodes.forEach((scans, itemId) => {
      scans.forEach(scan => {
        allScannedItems.push({
          orderItemId: itemId,
          stockId: scan.stockId,
          dividedId: scan.dividedId,
          barcode: scan.barcode
        });
      });
    });
    
    try {
      const response = await axios.post('/api/shipment/process', {
        orderId: id,
        scannedItems: allScannedItems,
        notes: shipmentNotes,
      });
      
      const result = response.data;
      
      toast({
        title: 'Shipment processed successfully',
        description: `Shipment #${result.shipment.id.substring(0, 8)} has been created.`,
      });
      
      // Generate and open travel document in a new tab
      const travelDocUrl = `/api/shipment/travel-document/${result.shipment.id}`;
      window.open(travelDocUrl, '_blank');
      
      // Redirect to shipment history
      router.push('/shipment/history');
      
    } catch (error) {
      console.error('Error processing shipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to process shipment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingShipment(false);
    }
  };

  // Function to remove a scanned item
  const removeScannedItem = (itemId: string, index: number) => {
    setScannedBarcodes(prev => {
      const updated = new Map(prev);
      const items = updated.get(itemId) || [];
      items.splice(index, 1);
      if (items.length === 0) {
        updated.delete(itemId);
      } else {
        updated.set(itemId, items);
      }
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load order details. Please try again later.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => router.push('/shipment/orders')}
        >
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Shipment</h1>
          <p className="text-muted-foreground">
            Scan items to prepare Order #{order.orderNo} for shipment
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/shipment/orders')}
        >
          Back to Orders
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Information about the order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Order Number</h3>
              <p className="font-semibold">{order.orderNo}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Customer</h3>
              <p className="font-semibold">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Shipping Address</h3>
              <p className="text-sm">{order.customer.address}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Order Date</h3>
              <p className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Barcode Scanner */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Scan Items</CardTitle>
            <CardDescription>
              Scan each item's barcode to verify and prepare for shipment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  id="barcode-input"
                  placeholder="Scan or enter barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button type="submit">Validate</Button>
              </div>
              
              {validationResult && (
                <Alert variant={validationResult.matched ? "default" : "destructive"}>
                  {validationResult.matched ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{validationResult.matched ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {validationResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </form>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Order Items ({getTotalScannedCount()}/{getTotalRequiredCount()} scanned)
              </h3>
              <div className="space-y-4">
                {order.orderItems.map((item: OrderItem) => {
                  const scannedItems = scannedBarcodes.get(item.id) || [];
                  const requiredCount = Number(item.quantity) || 1;
                  const isFullyScanned = scannedItems.length >= requiredCount;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 border rounded-lg ${
                        isFullyScanned ? 'bg-green-50 border-green-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{item.product || item.type}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku || 'N/A'} • Required quantity: {requiredCount}
                          </p>
                        </div>
                        <Badge variant={isFullyScanned ? "default" : "outline"}>
                          {scannedItems.length}/{requiredCount} Scanned
                        </Badge>
                      </div>
                      
                      {scannedItems.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-xs font-medium mb-2">Scanned items:</p>
                          <div className="space-y-2">
                            {scannedItems.map((scan, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                                <div>
                                  <span className="font-medium">Barcode:</span> {scan.barcode}
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({scan.stockId ? 'Stock' : scan.dividedId ? 'Divided' : 'Unknown'})
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeScannedItem(item.id, idx)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={handleProcessShipment} 
                disabled={!allItemsFullyScanned() || processingShipment}
                className="w-full"
                size="lg"
              >
                {processingShipment ? (
                  <>
                    <LoadingSpinner className="mr-2" size="sm" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-5 w-5" />
                    Process Shipment
                  </>
                )}
              </Button>
              {!allItemsFullyScanned() && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  All required items must be scanned before processing the shipment
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipment Notes</CardTitle>
          <CardDescription>
            Add any notes about this shipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={shipmentNotes}
            onChange={(e) => setShipmentNotes(e.target.value)}
            placeholder="Add shipment notes here (optional)"
          />
        </CardContent>
      </Card>
    </div>
  );
} 