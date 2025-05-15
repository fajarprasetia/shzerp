'use client';

import { useState, useEffect, use, useCallback } from 'react';
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
import { scanBarcode, scanBarcode128 } from '@/app/lib/inventory';

// For client components, we don't use revalidate or fetchCache directly
// dynamic is okay though
export const dynamic = 'force-dynamic';

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

export default function ShipmentProcessPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Use React.use() to unwrap params properly in Next.js 15.2+
  const unwrappedParams = params instanceof Promise ? use(params) : params;
  const id = unwrappedParams.id;
  
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
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
  const [isUsingExternalScanner, setIsUsingExternalScanner] = useState(false);
  const [scanBuffer, setScanBuffer] = useState('');
  const [scannedItemsList, setScannedItemsList] = useState<Array<{
    id: string;
    type: string;
    product?: string;
    barcode: string;
    timestamp: string;
  }>>([]);
  const router = useRouter();

  // Define fetchOrderDetails using useCallback to maintain consistent reference
  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shipment/orders/${id}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching order details:", errorData);
        
        // Handle the specific case of already shipped orders
        if (response.status === 400 && errorData.error === "Order is already shipped") {
          toast({
            variant: "default",
            title: "Order Already Shipped",
            description: "This order has already been processed and shipped.",
          });
          
          // Try to get the shipment ID to redirect to it
          try {
            const shipmentResponse = await fetch(`/api/shipment/history?orderId=${id}`, {
              cache: 'no-store'
            });
            
            if (shipmentResponse.ok) {
              const shipmentData = await shipmentResponse.json();
              if (shipmentData.shipments && shipmentData.shipments.length > 0) {
                // Redirect to the first shipment found for this order
                setTimeout(() => router.push(`/shipment/history/${shipmentData.shipments[0].id}`), 1500);
                return;
              }
            }
          } catch (shipmentError) {
            console.error("Error fetching shipment history:", shipmentError);
          }
          
          // Fallback to redirecting to orders list if we can't find the shipment
          setTimeout(() => router.push('/shipment/orders'), 1500);
          return;
        }
        
        // Handle any other errors
        toast({
          variant: "destructive",
          title: "Error",
          description: errorData.error || "Failed to fetch order details",
        });
        
        setTimeout(() => router.push('/shipment/orders'), 1500);
        return;
      }
      
      const data = await response.json();
      console.log("Order data:", data);
      
      // Initialize scan tracking with empty scanned arrays
      let orderWithScanStatus = {
        ...data,
        orderItems: data.orderItems.map((item: any) => ({
          ...item,
          scannedCount: 0,
          scannedBarcodes: []
        }))
      };
      
      // Step 1: First load any previously scanned items
      try {
        const scanStatusResponse = await fetch(`/api/shipment/orders/${id}/scan-status`, {
          cache: 'no-store'
        });
        
        if (scanStatusResponse.ok) {
          const scanStatusData = await scanStatusResponse.json();
          console.log("Scan status data:", scanStatusData);
          
          // Merge the scan status with the order data
          orderWithScanStatus = {
            ...data,
            orderItems: data.orderItems.map((item: any) => {
              // Find this item's scan status from the items array
              const itemScanStatus = scanStatusData.items?.find(
                (statusItem: any) => statusItem.orderItemId === item.id
              );
              
              return {
                ...item,
                scannedCount: itemScanStatus ? itemScanStatus.scannedCount : 0,
                scannedBarcodes: itemScanStatus ? itemScanStatus.scannedBarcodes : [],
                stockId: itemScanStatus ? itemScanStatus.stockId : item.stockId,
                dividedId: itemScanStatus ? itemScanStatus.dividedId : item.dividedId
              };
            })
          };
        } else {
          console.warn('Could not fetch scan status - starting with fresh scan counts');
        }
      } catch (error) {
        console.error("Error loading scan status:", error);
        // Continue without scan status data
      }
      
      // Step 2: Then try to find matched inventory items by orderNo
      try {
        console.log(`Looking for inventory matches with orderNo: ${orderWithScanStatus.orderNo}`);
        const orderItemsMatchResponse = await fetch(`/api/inventory/match-order?orderNo=${orderWithScanStatus.orderNo}`, {
          cache: 'no-store'
        });
        
        if (orderItemsMatchResponse.ok) {
          const matchedItemsData = await orderItemsMatchResponse.json();
          console.log("Matched items from inventory:", matchedItemsData);
          
          // Note: After the API fix, this will only include items that are already marked as sold (isSold=true)
          // Items that are only associated with the order but not yet scanned/shipped won't show up
          
          // Create a new scanned items list for all matches
          const newScannedItemsList: Array<{
            id: string;
            type: string;
            product?: string;
            barcode: string;
            timestamp: string;
          }> = [];
          
          // Process stock items
          if (matchedItemsData.stockItems?.length > 0) {
            console.log("Processing matched stock items");
            matchedItemsData.stockItems.forEach((stock: any) => {
              // Find matching order item (if any)
              const matchingOrderItem = orderWithScanStatus.orderItems.find(
                (item: any) => item.stockId === stock.id
              ) || orderWithScanStatus.orderItems.find(
                (item: any) => item.type.toLowerCase() === stock.type?.toLowerCase()
              ) || orderWithScanStatus.orderItems[0]; // Fallback to first item
              
              console.log(`Matching stock ${stock.barcodeId} to order item: ${matchingOrderItem.type}`);
              
              newScannedItemsList.push({
                id: matchingOrderItem.id,
                type: stock.type || matchingOrderItem.type,
                product: matchingOrderItem.product,
                barcode: stock.barcodeId,
                timestamp: new Date().toISOString()
              });
            });
          }
          
          // Process divided items
          if (matchedItemsData.dividedItems?.length > 0) {
            console.log("Processing matched divided items");
            matchedItemsData.dividedItems.forEach((divided: any) => {
              // Find matching order item by prioritizing items that are specifically for divided/roll types
              let matchingOrderItem = null;
              
              // First try direct match by ID
              matchingOrderItem = orderWithScanStatus.orderItems.find(
                (item: any) => item.dividedId === divided.id
              );
              
              // If no direct match, try by type
              if (!matchingOrderItem) {
                matchingOrderItem = orderWithScanStatus.orderItems.find(
                  (item: any) => 
                    item.type.toLowerCase().includes('divided') || 
                    item.type.toLowerCase().includes('roll') ||
                    item.type.toLowerCase().includes('paper')
                );
              }
              
              // Default to first item if no matches at all
              if (!matchingOrderItem) {
                matchingOrderItem = orderWithScanStatus.orderItems[0];
              }
              
              console.log(`Matching divided item ${divided.barcodeId} to order item: ${matchingOrderItem.type}`);
              
              // Create a new scanned item entry
              newScannedItemsList.push({
                id: matchingOrderItem.id,
                type: matchingOrderItem.type || "Unknown Type",
                product: matchingOrderItem.product || undefined,
                barcode: divided.barcodeId,
                timestamp: new Date().toISOString()
              });
              
              // Update the order item's dividedId if it wasn't set
              if (!matchingOrderItem.dividedId) {
                matchingOrderItem.dividedId = divided.id;
              }
            });
          }
          
          // Update scanned counts in the order items
          if (newScannedItemsList.length > 0) {
            console.log(`Found ${newScannedItemsList.length} matched inventory items total`);
            
            // Count by order item ID
            const countsByOrderItem: Record<string, {count: number, barcodes: string[]}> = {};
            
            newScannedItemsList.forEach(item => {
              if (!countsByOrderItem[item.id]) {
                countsByOrderItem[item.id] = {count: 0, barcodes: []};
              }
              countsByOrderItem[item.id].count++;
              countsByOrderItem[item.id].barcodes.push(item.barcode);
            });
            
            // Update the order items
            orderWithScanStatus.orderItems = orderWithScanStatus.orderItems.map((item: any) => {
              const counts = countsByOrderItem[item.id];
              if (counts) {
                return {
                  ...item,
                  scannedCount: Math.max(item.scannedCount || 0, counts.count),
                  scannedBarcodes: Array.from(new Set([...(item.scannedBarcodes || []), ...counts.barcodes]))
                };
              }
              return item;
            });
            
            // Set the scanned items list
            console.log("Setting scanned items list:", newScannedItemsList);
            setScannedItemsList(newScannedItemsList);
          } else {
            console.log("No matched inventory items found to display");
          }
        } else {
          // Handle API error gracefully
          console.error(`Failed to fetch inventory matches: ${orderItemsMatchResponse.status}`);
          
          // Try a simpler API route as a fallback - specifically for divided items
          try {
            console.log("Trying fallback divided items API...");
            const dividedResponse = await fetch(`/api/inventory/divided?orderNo=${orderWithScanStatus.orderNo}`, {
              cache: 'no-store'
            });
            
            if (dividedResponse.ok) {
              const dividedItems = await dividedResponse.json();
              console.log("Fallback: Found divided items:", dividedItems);
              
              // If we got divided items, create a simplified list
              // Note: After the API fix, these will only be items that are already marked as sold (isSold=true)
              if (dividedItems && dividedItems.length > 0) {
                // Find the first order item of type 'divided' or that mentions 'roll'
                const dividedOrderItem = orderWithScanStatus.orderItems.find((item: {type: string}) => 
                  item.type.toLowerCase().includes('divided') || 
                  item.type.toLowerCase().includes('roll') ||
                  item.type.toLowerCase().includes('paper')
                ) || orderWithScanStatus.orderItems[0]; // Fallback to first item
                
                console.log(`Found matching order item for divided items: ${dividedOrderItem.type}`);
                
                // Create new scanned items for each divided item found
                const simpleScannedItems = dividedItems.map((item: any) => ({
                  id: dividedOrderItem.id,
                  type: dividedOrderItem.type,
                  product: dividedOrderItem.product,
                  barcode: item.barcodeId,
                  timestamp: new Date().toISOString()
                }));
                
                // Add to our scanned items list - directly set it rather than append
                console.log("Setting fallback scanned items:", simpleScannedItems);
                setScannedItemsList(simpleScannedItems);
                
                // Update the order item count
                orderWithScanStatus.orderItems = orderWithScanStatus.orderItems.map((item: {id: string}) => {
                  if (item.id === dividedOrderItem.id) {
                    const scannedItemsForThisType = dividedItems.filter((d: any) => d.barcodeId).length;
                    return {
                      ...item,
                      scannedCount: scannedItemsForThisType,
                      scannedBarcodes: dividedItems.map((d: any) => d.barcodeId),
                      dividedId: dividedItems[0]?.id // Use the first divided item's ID
                    };
                  }
                  return item;
                });
                
                console.log("Updated order with fallback divided items");
              }
            }
          } catch (fallbackError) {
            console.error("Fallback divided item fetch failed:", fallbackError);
          }
        }
      } catch (error) {
        console.error("Error fetching inventory matches:", error);
        // Continue without matched inventory data
      }
      
      console.log("Final order with scan status:", orderWithScanStatus);
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
  }, [id, router]);

  // Call fetchOrderDetails once when the component mounts
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Update derived state when order changes
  useEffect(() => {
    if (!order) return;
    
    // Calculate total items and scanned count
    const total = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const scanned = order.orderItems.reduce((sum, item) => sum + (item.scannedCount || 0), 0);
    
    setTotalItems(total);
    setScannedCount(scanned);
    
    // Check if all items are scanned
    setIsShippingComplete(scanned >= total);
    
    // Generate scanned items list for display
    const newScannedItemsList: Array<{
      id: string;
      type: string;
      product?: string;
      barcode: string;
      timestamp: string;
    }> = [];
    
    order.orderItems.forEach(item => {
      if (item.scannedBarcodes && item.scannedBarcodes.length > 0) {
        item.scannedBarcodes.forEach(barcode => {
          newScannedItemsList.push({
            id: item.id,
            type: item.type,
            product: item.product,
            barcode,
            timestamp: new Date().toISOString(), // We don't have actual timestamps for existing items
          });
        });
      }
    });
    
    setScannedItemsList(newScannedItemsList);
  }, [order]);

  // Debug state after scanning
  useEffect(() => {
    if (scannedItemsList.length > 0) {
      console.log("Scanned items in state:", scannedItemsList);
    }
  }, [scannedItemsList]);

  // Explicitly check after render if we have scanned items but count is zero
  useEffect(() => {
    if (order && scannedItemsList.length > 0 && scannedCount === 0) {
      console.warn("Inconsistent state: scanned items exist but count is 0");
    }
  }, [order, scannedItemsList, scannedCount]);

  const handleScan = async () => {
    setIsScanning(true);
    setIsScanSuccess(false);
    setLastScannedItem(null);
    setLastScanError(null);

    try {
      // Display a helpful notification before scanning starts
      toast({
        title: "Starting Scanner",
        description: "Position the barcode within the scanning box and hold the camera steady",
      });
      
      // Use scanBarcode128 with mobile-optimized settings
      const result = await scanBarcode128({
        // Mobile-friendly configuration
        successThreshold: 2,          // Lower threshold for faster scanning
        frequency: 15,                // Increased scanning frequency
        locator: {
          patchSize: "medium",        // Medium patch size for better balance
          halfSample: true,           // Enable half sample for performance
        },
        timeout: 30000                // 30 seconds maximum scan time (reduced from 60s)
      });
      
      console.log("Scan result:", result);
      
      if (result.success && result.data) {
        // Process the scanned barcode
        toast({
          title: "Barcode Detected",
          description: result.data,
        });
        await processScannedBarcode(result.data);
      } else if (result.error) {
        console.error("Scan error:", result.error);
        
        // Provide more user-friendly error messages
        let errorMessage = result.error;
        
        if (result.error.includes('cancelled')) {
          errorMessage = "Scanning was cancelled";
        } else if (result.error.includes('timed out')) {
          errorMessage = "Scanning timed out. Try holding the camera more steady or adjusting lighting.";
        } else if (result.error.includes('permissions')) {
          errorMessage = "Camera access was denied. Please allow camera permissions.";
        }
        
        setLastScanError(errorMessage);
        toast({
          variant: "destructive",
          title: "Scan Error",
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('Error during scanning:', error);
      setLastScanError('Scanning failed. Please try again or enter manually.');
      toast({
        variant: "destructive",
        title: "Scan Error",
        description: "Failed to scan barcode. Please try again or enter manually.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) {
      setLastScanError('Please enter a barcode');
      return;
    }

    setIsProcessingBarcode(true);
    setIsScanSuccess(false);
    setLastScannedItem(null);
    setLastScanError(null);

    try {
      await processScannedBarcode(manualBarcodeInput.trim());
      // Clear the input field on success
      setManualBarcodeInput('');
    } catch (error) {
      console.error('Error processing manual barcode:', error);
      setLastScanError('Failed to process barcode');
    } finally {
      setIsProcessingBarcode(false);
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
      cache: 'no-store'
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
        
        // If item type is "Jumbo Roll" or contains "Jumbo", check by barcode instead of quantity
        // This allows scanning multiple unique jumbo rolls when order quantity > 1
        if (currentItem.type.toLowerCase().includes("jumbo") && currentScannedCount >= currentItem.quantity) {
          // For Jumbo Rolls, only show the error if we've already scanned this exact barcode
          if (scannedBarcodes.includes(barcodeValue)) {
            setLastScanError(`This Jumbo Roll has already been scanned`);
            toast({
              variant: "default",
              title: "Duplicate Scan",
              description: `This Jumbo Roll has already been scanned`,
            });
            return;
          }
        } else if (currentScannedCount >= currentItem.quantity) {
          // For other item types, enforce the quantity limit strictly
          setLastScanError(`Already scanned all ${currentItem.quantity} items of this type`);
          toast({
            variant: "default",
            title: "Maximum Quantity Reached",
            description: `Already scanned all ${currentItem.quantity} items of this type`,
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
        
        // Add the newly scanned item to the scanned items list
        const newScannedItem = {
          id: currentItem.id,
          type: currentItem.type,
          product: currentItem.product,
          barcode: barcodeValue,
          timestamp: new Date().toISOString(),
        };
        
        setScannedItemsList(prev => [newScannedItem, ...prev]);
        
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
            cache: 'no-store'
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
        cache: 'no-store'
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

  // Function to handle external barcode scanner input
  const toggleExternalScanner = () => {
    if (isUsingExternalScanner) {
      // Turn off external scanner
      window.removeEventListener('keypress', handleExternalScannerInput);
      setIsUsingExternalScanner(false);
      toast({
        title: "External Scanner Disabled",
        description: "External barcode scanner is now disconnected.",
      });
    } else {
      // Turn on external scanner
      window.addEventListener('keypress', handleExternalScannerInput);
      setIsUsingExternalScanner(true);
      toast({
        title: "External Scanner Ready",
        description: "External barcode scanner is now connected. Scan a barcode with your device.",
        variant: "default",
      });
    }
  };

  // Handle input from external barcode scanner
  const handleExternalScannerInput = (event: KeyboardEvent) => {
    // Most barcode scanners end with Enter key (charCode 13)
    if (event.key === 'Enter') {
      // Process the complete barcode
      if (scanBuffer.length > 0) {
        processScannedBarcode(scanBuffer);
        // Reset buffer after processing
        setScanBuffer('');
      }
    } else {
      // Add character to buffer
      setScanBuffer(prev => prev + event.key);
    }
  };

  // Cleanup event listener when component unmounts
  useEffect(() => {
    return () => {
      if (isUsingExternalScanner) {
        window.removeEventListener('keypress', handleExternalScannerInput);
      }
    };
  }, [isUsingExternalScanner]);

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
                  <Badge variant={scannedCount === totalItems ? "success" : (scannedCount > 0 ? "secondary" : "outline")} className="text-base">
                    {scannedCount} / {totalItems} 
                    {scannedCount > 0 && scannedCount < totalItems && ` (${totalItems - scannedCount} remaining)`}
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
              Scan items or enter barcodes manually
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
              {isScanning ? (
                <>
                <div className="animate-pulse">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                </div>
                  {/* Scan guide overlay */}
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <div className="border-2 border-dashed border-primary w-4/5 h-2/3 rounded-lg flex items-center justify-center">
                      <div className="text-xs text-primary font-medium">Position barcode here</div>
                    </div>
                    <div className="absolute top-1/2 w-full h-1 bg-red-500/60 animate-scan-line"></div>
                  </div>
                </>
              ) : isScanSuccess ? (
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                  <p className="mt-2 text-sm">Successfully scanned</p>
                  {lastScannedItem && <p className="font-medium">{lastScannedItem}</p>}
                </div>
              ) : isUsingExternalScanner ? (
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto text-blue-500">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                    <rect width="10" height="6" x="7" y="7" rx="1"></rect>
                    <path d="M12 17v-4"></path>
                  </svg>
                  <p className="mt-2 text-sm">External Scanner Active</p>
                  <p className="text-xs text-muted-foreground">
                    Scan a barcode with your device
                    {scanBuffer && <span className="block font-mono mt-1">Receiving: {scanBuffer}</span>}
                  </p>
                </div>
              ) : (
                <Camera className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            
            {/* Manual barcode input form */}
            <form onSubmit={handleManualBarcodeSubmit} className="w-full mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter barcode manually"
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading || isProcessingBarcode || isShippingComplete}
                />
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={isLoading || isProcessingBarcode || isShippingComplete || !manualBarcodeInput.trim()}
                >
                  {isProcessingBarcode ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  ) : (
                    <span>Submit</span>
                  )}
                </Button>
              </div>
            </form>
            
            {lastScanError && (
              <div className="w-full p-2 mb-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-sm">
                {lastScanError}
              </div>
            )}
            
            {/* Update the button container layout to wrap properly */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Button 
                onClick={handleScan} 
                size="lg" 
                disabled={isLoading || isScanning || isShippingComplete || isUsingExternalScanner}
                className="flex items-center justify-center w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isScanning ? 'Scanning...' : 'Scan Item'}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setUseBackCamera(!useBackCamera)}
                disabled={isLoading || isScanning || isShippingComplete || isUsingExternalScanner}
                className="flex items-center justify-center w-full"
                title={useBackCamera ? "Switch to Front Camera" : "Switch to Back Camera"}
              >
                <Camera className="h-5 w-5" />
              </Button>

              <Button
                variant={isUsingExternalScanner ? "default" : "outline"}
                size="lg"
                onClick={toggleExternalScanner}
                disabled={isLoading || isScanning || isShippingComplete}
                className="flex items-center justify-center w-full"
                title={isUsingExternalScanner ? "Disable External Scanner" : "Use External Scanner"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                  className="h-5 w-5">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                  <rect width="10" height="6" x="7" y="7" rx="1"></rect>
                  <path d="M12 17v-4"></path>
                </svg>
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

      {/* Scanned Items List Card - Always display, even when empty */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scanned Items ({scannedItemsList.length})</CardTitle>
              <CardDescription>
                Items that have been scanned or found in inventory
              </CardDescription>
            </div>
            {scannedCount === totalItems && totalItems > 0 && (
              <Badge variant="success" className="ml-auto">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                All Items Scanned
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {scannedItemsList.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Time</TableHead>
                    <TableHead>Item Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right w-28">Barcode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedItemsList.map((item, idx) => (
                    <TableRow key={`scan-${idx}-${item.barcode}`} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.type}
                      </TableCell>
                      <TableCell>
                        {item.product && <span>{item.product}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-semibold">
                          {item.barcode}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No items scanned yet. Use the scanner above to scan items or check your order status.
            </div>
          )}
        </CardContent>
      </Card>

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
                      <Badge className={item.scannedCount === item.quantity ? 
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : 
                        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"}>
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

      {/* Add a small debug section that's collapsible (hidden by default) */}
      <div className="mt-4 text-xs">
        <details className="text-muted-foreground">
          <summary className="cursor-pointer mb-2 font-medium">Debug Information (click to expand)</summary>
          <div className="p-4 border rounded-md bg-muted/50 space-y-1">
            <div>Order ID: {id}</div>
            <div>Order Number: {order?.orderNo}</div>
            <div>Scanned items count: {scannedItemsList.length}</div>
            <div>Total items in order: {totalItems}</div>
            <div>Total items scanned count: {scannedCount}</div>
            <div>Is shipping complete: {isShippingComplete ? 'Yes' : 'No'}</div>
            <div>Last scan error: {lastScanError || 'None'}</div>
            <div>Last scanned item: {lastScannedItem || 'None'}</div>
            {order?.orderItems?.length > 0 && (
              <>
                <div className="mt-2 font-medium">Order items:</div>
                <ul className="list-disc pl-5">
                  {order.orderItems.map((item, idx) => (
                    <li key={idx}>
                      {item.type} - Qty: {item.quantity}, Scanned: {item.scannedCount || 0}, 
                      {item.stockId ? ` StockID: ${item.stockId.substring(0, 8)}...` : ''}
                      {item.dividedId ? ` DividedID: ${item.dividedId.substring(0, 8)}...` : ''}
                      {(item.scannedBarcodes && item.scannedBarcodes.length > 0) ? ` Barcodes: ${item.scannedBarcodes.length}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {scannedItemsList.length > 0 && (
              <>
                <div className="mt-2 font-medium">Scanned barcodes:</div>
                <ul className="list-disc pl-5">
                  {scannedItemsList.map((item, idx) => (
                    <li key={idx}>
                      {item.barcode} - {item.type} {item.product ? `(${item.product})` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
} 