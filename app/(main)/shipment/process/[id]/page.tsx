'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Truck, Camera, CameraOff, Check, X, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { scanBarcode } from '@/lib/inventory';

interface OrderDetail {
  id: string;
  orderNo: string;
  customerId: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  orderItems: Array<{
    id: string;
    type: string;
    product?: string;
    gsm?: string;
    width?: string;
    length?: string;
    weight?: string;
    quantity: number;
    stockId?: string;
    dividedId?: string;
    scannedCount?: number;
    scannedBarcodes?: string[];
  }>;
  note?: string;
}

export default function ShipmentProcessPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanSuccess, setIsScanSuccess] = useState(false);
  const [isShippingComplete, setIsShippingComplete] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [lastScannedItem, setLastScannedItem] = useState<string | null>(null);
  const [lastScanError, setLastScanError] = useState<string | null>(null);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrderDetails();
  }, [params.id]);

  useEffect(() => {
    if (order) {
      // Calculate total items and scanned count
      const total = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const scanned = order.orderItems.reduce((sum, item) => sum + (item.scannedCount || 0), 0);
      
      setTotalItems(total);
      setScannedCount(scanned);
      
      // Check if all items are scanned
      setIsShippingComplete(scanned >= total);
    }
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shipment/orders/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const data = await response.json();
      
      // Fetch previously scanned items for this order
      const scanStatusResponse = await fetch(`/api/shipment/orders/${params.id}/scan-status`);
      
      if (!scanStatusResponse.ok) {
        console.warn('Could not fetch scan status - starting with fresh scan counts');
        
        // Initialize scan tracking with zeroes if we can't fetch status
        const orderWithScanStatus = {
          ...data,
          orderItems: data.orderItems.map((item: any) => ({
            ...item,
            scannedCount: 0,
            scannedBarcodes: []
          }))
        };
        
        setOrder(orderWithScanStatus);
        return;
      }
      
      const scanStatusData = await scanStatusResponse.json();
      
      // Merge the scan status with the order data
      const orderWithScanStatus = {
        ...data,
        orderItems: data.orderItems.map((item: any) => {
          const itemScanStatus = scanStatusData.items.find((statusItem: any) => statusItem.orderItemId === item.id);
          
          return {
            ...item,
            scannedCount: itemScanStatus ? itemScanStatus.scannedCount : 0,
            scannedBarcodes: itemScanStatus ? itemScanStatus.scannedBarcodes : [],
            stockId: itemScanStatus ? itemScanStatus.stockId : null,
            dividedId: itemScanStatus ? itemScanStatus.dividedId : null
          };
        })
      };
      
      setOrder(orderWithScanStatus);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load order details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setIsScanSuccess(false);
    setLastScannedItem(null);
    setLastScanError(null);

    try {
      // Use our real barcode scanning function
      const result = await scanBarcode(useBackCamera);
      
      if (result.success && result.data) {
        // Process the scanned barcode
        await processScannedBarcode(result.data);
      } else if (result.error) {
        setLastScanError(result.error);
        toast({
          variant: "destructive",
          title: "Scan Error",
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error during scanning:', error);
      setLastScanError('Scanning failed. Please try again.');
      toast({
        variant: "destructive",
        title: "Scan Error",
        description: "Failed to scan barcode.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const processScannedBarcode = async (barcodeValue: string) => {
    if (!order) return;
    
    // Skip processing if there's no barcode value
    if (!barcodeValue) {
      setLastScanError('No barcode detected. Please try again.');
      return;
    }
    
    // Call API to validate barcode
    const response = await fetch('/api/shipment/validate-barcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.id,
        barcodeValue
      }),
    });
    
    if (!response.ok) {
      // Handle API error
      const errorData = await response.json();
      setLastScanError(errorData.error || 'Barcode validation failed');
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: errorData.error || 'Barcode validation failed',
      });
      return;
    }
    
    const result = await response.json();
    
    if (result.matched) {
      // Check if this is an already scanned item being re-acknowledged
      if (result.alreadyScanned) {
        setIsScanSuccess(true);
        setLastScannedItem(result.item.type + (result.item.product ? ` (${result.item.product})` : ''));

        toast({
          variant: "default",
          title: "Item Already Scanned",
          description: `This item was already scanned for this order. Record verified.`,
        });
        return;
      }

      // Update the UI to mark the item as scanned
      setIsScanSuccess(true);
      setLastScannedItem(result.item.type + (result.item.product ? ` (${result.item.product})` : ''));
      
      // Find the matched order item
      const matchedItemIndex = order.orderItems.findIndex(item => item.id === result.item.id);
      
      if (matchedItemIndex >= 0) {
        // Check if we've already scanned the maximum quantity
        const currentItem = order.orderItems[matchedItemIndex];
        const currentScannedCount = currentItem.scannedCount || 0;
        
        if (currentScannedCount >= currentItem.quantity) {
          setLastScanError(`Already scanned all ${currentItem.quantity} items of this type`);
          toast({
            variant: "default",
            title: "Maximum Quantity Reached",
            description: `Already scanned all ${currentItem.quantity} items of this type`,
          });
          return;
        }
        
        // Check if we've already scanned this specific barcode
        const scannedBarcodes = currentItem.scannedBarcodes || [];
        if (scannedBarcodes.includes(barcodeValue)) {
          setLastScanError('This item has already been scanned');
          toast({
            variant: "default",
            title: "Duplicate Scan",
            description: "This specific item has already been scanned",
          });
          return;
        }
        
        // Update the order with the scanned item - store the stockId or dividedId from validation
        const updatedItems = [...order.orderItems];
        updatedItems[matchedItemIndex] = {
          ...currentItem,
          scannedCount: currentScannedCount + 1,
          scannedBarcodes: [...scannedBarcodes, barcodeValue],
          stockId: result.stock?.id || currentItem.stockId,
          dividedId: result.divided?.id || currentItem.dividedId
        };
        
        // If we've just completed scanning this item type, show special notification
        const itemCompleted = currentScannedCount + 1 === currentItem.quantity;
        const remainingOfThisType = currentItem.quantity - (currentScannedCount + 1);
        
        setOrder({
          ...order,
          orderItems: updatedItems
        });
        
        // Also save this scan to the backend to persist across page refreshes
        try {
          await fetch('/api/shipment/record-scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: order.id,
              orderItemId: currentItem.id,
              barcodeValue,
              stockId: result.stock?.id || null,
              dividedId: result.divided?.id || null,
            }),
          });
        } catch (error) {
          console.error("Failed to record scan in backend:", error);
          // We don't show an error to the user here, as the scan was successful
          // in the UI, and this is just a backup
        }
        
        // Show success toast with appropriate message
        if (itemCompleted) {
          toast({
            title: "Item Complete",
            description: `Successfully scanned all ${currentItem.quantity} of: ${currentItem.type}`,
            variant: "default",
          });
        } else if (remainingOfThisType > 0) {
          toast({
            title: "Item Scanned",
            description: `Successfully scanned: ${currentItem.type}. ${remainingOfThisType} more to scan for this item.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Item Scanned",
            description: `Successfully scanned: ${currentItem.type}`,
            variant: "default",
          });
        }
      }
    } else {
      // Show error for non-matching barcode
      setLastScanError(result.error || 'Barcode does not match any item in this order');
      toast({
        variant: "destructive",
        title: "Scan Error",
        description: result.error || 'Barcode does not match any item in this order',
      });
    }
  };

  const handleCompleteShipment = async () => {
    if (!order) return;
    
    // Validate that all items are scanned
    if (scannedCount < totalItems) {
      toast({
        variant: "destructive",
        title: "Shipment Incomplete",
        description: `Only ${scannedCount} of ${totalItems} items have been scanned.`,
      });
      return;
    }
    
    try {
      // Prepare data for API - now with proper stockId and dividedId
      const scannedItems = order.orderItems.flatMap(item => {
        // Only include items that have been scanned
        if (!item.scannedCount || item.scannedCount === 0) {
          return [];
        }
        
        const barcodes = item.scannedBarcodes || [];
        // Create entries for each scanned barcode
        return barcodes.map(barcode => ({
          orderItemId: item.id,
          barcode,
          stockId: item.stockId || null,
          dividedId: item.dividedId || null
        }));
      });
      
      console.log("Sending shipment completion data:", {
        orderId: order.id,
        scannedItems
      });
      
      // Call API to complete shipment with the new data structure
      const response = await fetch('/api/shipment/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          orderItems: order.orderItems,
          scannedItems,
          shipmentNotes: ""
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete shipment');
      }
      
      // Get the shipment data from the response
      const shipmentData = await response.json();
      
      // Show success message
      toast({
        title: "Shipment Complete",
        description: `Order ${order.orderNo} has been successfully shipped.`,
        action: <ToastAction altText="View History" onClick={() => router.push('/shipment/history')}>
          View History
        </ToastAction>,
      });
      
      // Open travel document in a new tab if available
      if (shipmentData && shipmentData.shipment && shipmentData.shipment.id) {
        // Small delay to ensure PDF generation is ready
        setTimeout(() => {
          window.open(`/api/shipment/travel-document/${shipmentData.shipment.id}`, '_blank');
        }, 500);
      }
      
      // Close dialog and redirect
      setShowCompleteDialog(false);
      router.push('/shipment/orders');
      
    } catch (error) {
      console.error('Error completing shipment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to complete shipment',
      });
    }
  };

  // Get formatted item details for display
  const getItemDisplayText = (item: OrderDetail['orderItems'][0]) => {
    let details = `${item.type}`;
    
    if (item.product) {
      details += ` - ${item.product}`;
    }
    
    if (item.gsm) {
      details += `, ${item.gsm} GSM`;
    }
    
    if (item.width) {
      details += `, Width: ${item.width}`;
    }
    
    if (item.length) {
      details += `, Length: ${item.length}`;
    }
    
    if (item.weight) {
      details += `, Weight: ${item.weight}`;
    }
    
    return details;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Order Not Found</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/shipment/orders')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p>The order you are looking for does not exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button 
        variant="link"
        onClick={() => router.back()}
        className="pl-0 flex items-center text-muted-foreground mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Process Shipment</h1>
          <Badge variant="outline" className="text-base ml-2">
            Order: {order.orderNo}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Created on {formatDate(new Date(order.createdAt))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer Information</h3>
                <div className="text-lg font-semibold">{order.customer.name}</div>
                <div>{order.customer.phone}</div>
                <div className="mt-2 text-sm text-muted-foreground">{order.customer.address}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Shipping Status</h3>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">Items Scanned:</div>
                  <Badge variant={scannedCount === totalItems ? "success" : "outline"}>
                    {scannedCount} / {totalItems}
                  </Badge>
                </div>
                {order.note && (
                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
                    <div className="text-sm">{order.note}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Barcode Scanner</CardTitle>
            <CardDescription>
              Scan items to verify before shipping
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
              {isScanning ? (
                <div className="animate-pulse">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                </div>
              ) : isScanSuccess ? (
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                  <p className="mt-2 text-sm">Successfully scanned</p>
                  {lastScannedItem && <p className="font-medium">{lastScannedItem}</p>}
                </div>
              ) : (
                <Camera className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            {lastScanError && (
              <div className="w-full p-2 mb-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-sm">
                {lastScanError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleScan} 
                size="lg" 
                disabled={isLoading || isScanning || isShippingComplete}
                className="flex items-center justify-center w-full sm:w-auto"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isScanning ? 'Scanning...' : 'Scan Item'}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setUseBackCamera(!useBackCamera)}
                disabled={isLoading || isScanning || isShippingComplete}
                className="flex items-center justify-center w-full sm:w-auto"
              >
                {useBackCamera ? (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Using Back Camera
                  </>
                ) : (
                  <>
                    <CameraOff className="mr-2 h-4 w-4" />
                    Using Front Camera
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  variant="default"
                  disabled={!isShippingComplete}
                  onClick={() => setShowCompleteDialog(true)}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Complete Shipment
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Shipment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to complete this shipment? This will mark all scanned items as shipped and update the inventory.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCompleteShipment}>
                    Complete Shipment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            All items must be scanned before shipment can be completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]">#</TableHead>
                <TableHead className="w-[60%]">Item Details</TableHead>
                <TableHead className="w-[15%]">Quantity</TableHead>
                <TableHead className="w-[20%]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.orderItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{getItemDisplayText(item)}</span>
                      {item.dividedId && <span className="block text-xs text-muted-foreground">Divided ID: {item.dividedId}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {item.scannedCount && item.scannedCount > 0 ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <Check className="mr-1 h-3 w-3" />
                        Scanned {item.scannedCount}/{item.quantity}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">
                        <XCircle className="mr-1 h-3 w-3" />
                        Not Scanned
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 