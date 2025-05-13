import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Export configuration to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API endpoint to fetch the scan status of items in an order
 * This allows the Process Shipment page to load previously scanned items after a page refresh
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Access the ID directly from params - no Promise handling needed in the API route
    const orderId = params.id;
    
    console.log(`Fetching scan status for order: ${orderId}`);
    
    // First, verify the order exists with order items and their scanned counts
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if the order already has a completed shipment
    const existingCompletedShipment = await prisma.shipment.findFirst({
      where: { 
        orderId,
        status: "COMPLETED"
      }
    });

    if (existingCompletedShipment) {
      return NextResponse.json({ 
        error: "Order is already shipped",
        shipmentId: existingCompletedShipment.id 
      }, { status: 400 });
    }

    // Find any shipment items associated with this order
    // These would be items that were previously scanned but may not have been completed
    const shipmentItems = await prisma.shipmentItem.findMany({
      where: {
        orderItem: {
          orderId: orderId,
        }
      },
      include: {
        orderItem: true,
        stock: {
          select: {
            barcodeId: true,
            type: true
          }
        },
        divided: {
          select: {
            barcodeId: true
          }
        }
      }
    });

    console.log(`Found ${shipmentItems.length} shipment items for order ${orderId}`);

    // Group the shipment items by order item ID
    const scanStatusByOrderItem = shipmentItems.reduce((result: Record<string, any>, item) => {
      const orderItemId = item.orderItemId;
      
      if (!result[orderItemId]) {
        result[orderItemId] = {
          orderItemId,
          scannedCount: 0,
          scannedBarcodes: [],
          stockId: null,
          dividedId: null,
        };
      }
      
      // Add the barcode to the list if it exists
      if (item.scannedBarcode) {
        result[orderItemId].scannedBarcodes.push(item.scannedBarcode);
      }
      
      // Increment the count
      result[orderItemId].scannedCount++;
      
      // Store stockId and dividedId if available
      if (item.stockId) {
        result[orderItemId].stockId = item.stockId;
      }
      
      if (item.dividedId) {
        result[orderItemId].dividedId = item.dividedId;
      }
      
      return result;
    }, {});

    // Now check each order item for scannedCount field
    for (const orderItem of order.orderItems) {
      // If we already have scan data from shipment items, use the higher count
      if (scanStatusByOrderItem[orderItem.id]) {
        const existingRecord = scanStatusByOrderItem[orderItem.id];
        
        // If the orderItem.scannedCount is higher, update our count
        // This might happen if there was a database update but not all shipment items were created
        if (orderItem.scannedCount && orderItem.scannedCount > existingRecord.scannedCount) {
          existingRecord.scannedCount = orderItem.scannedCount;
          
          // If we're missing barcode info but have a count, add placeholder barcodes
          // This ensures the UI shows the correct number of scanned items
          if (existingRecord.scannedBarcodes.length < orderItem.scannedCount) {
            const missingCount = orderItem.scannedCount - existingRecord.scannedBarcodes.length;
            for (let i = 0; i < missingCount; i++) {
              existingRecord.scannedBarcodes.push(`generated-barcode-${orderItem.id}-${i}`);
            }
          }
        }
        
        // Ensure stockId and dividedId are set if available in the order item
        if (orderItem.stockId && !existingRecord.stockId) {
          existingRecord.stockId = orderItem.stockId;
        }
        
        if (orderItem.dividedId && !existingRecord.dividedId) {
          existingRecord.dividedId = orderItem.dividedId;
        }
      } 
      // If we don't have any scan data but the order item has a scannedCount, create a record
      else if (orderItem.scannedCount && orderItem.scannedCount > 0) {
        // Create a new scan status record based on the order item
        const placeholderBarcodes = [];
        for (let i = 0; i < orderItem.scannedCount; i++) {
          placeholderBarcodes.push(`generated-barcode-${orderItem.id}-${i}`);
        }
        
        scanStatusByOrderItem[orderItem.id] = {
          orderItemId: orderItem.id,
          scannedCount: orderItem.scannedCount,
          scannedBarcodes: placeholderBarcodes,
          stockId: orderItem.stockId || null,
          dividedId: orderItem.dividedId || null,
        };
      }
    }

    // Convert to array
    const scanStatusArray = Object.values(scanStatusByOrderItem);

    // Also check stock and divided tables for items marked as sold for this order
    // This helps identify items that can't be scanned again
    const soldStockItems = await prisma.stock.findMany({
      where: {
        orderNo: order.orderNo,
        isSold: true,
      },
      select: {
        id: true,
        barcodeId: true,
        type: true
      }
    });

    const soldDividedItems = await prisma.divided.findMany({
      where: {
        orderNo: order.orderNo,
        isSold: true,
      },
      select: {
        id: true,
        barcodeId: true
      }
    });

    console.log(`Found ${soldStockItems.length} sold stock items and ${soldDividedItems.length} sold divided items`);

    // Merge the sold item information into our result
    // We'll check the order items and match them against sold items where possible
    // This is important for cases where items are marked sold but shipment isn't complete
    for (const orderItem of order.orderItems) {
      // If we don't already have this order item in our scan status, we need to initialize it
      if (!scanStatusByOrderItem[orderItem.id]) {
        const matchingSoldStock = soldStockItems.find(stock => 
          orderItem.stockId && stock.id === orderItem.stockId
        );
        
        const matchingSoldDivided = soldDividedItems.find(divided => 
          orderItem.dividedId && divided.id === orderItem.dividedId
        );
        
        if (matchingSoldStock || matchingSoldDivided) {
          const item = matchingSoldStock || matchingSoldDivided;
          scanStatusArray.push({
            orderItemId: orderItem.id,
            scannedCount: 1, // We assume it was scanned once if it's sold
            scannedBarcodes: [item?.barcodeId || ""], 
            stockId: matchingSoldStock?.id || null,
            dividedId: matchingSoldDivided?.id || null,
          });
        }
      }
    }

    // Calculate total scanning progress for the order
    const totalItemCount = order.orderItems.reduce(
      (sum, item) => sum + (item.quantity || 0), 0
    );
    
    const totalScannedCount = scanStatusArray.reduce(
      (sum, item) => sum + (item.scannedCount || 0), 0
    );
    
    const scanProgress = {
      totalItems: totalItemCount,
      scannedItems: totalScannedCount,
      isComplete: totalScannedCount >= totalItemCount && totalItemCount > 0
    };

    const response = { 
      items: scanStatusArray,
      progress: scanProgress
    };
    
    console.log("Returning scan status:", response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching scan status:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan status" }, 
      { status: 500 }
    );
  }
} 