import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API endpoint to fetch the scan status of items in an order
 * This allows the Process Shipment page to load previously scanned items after a page refresh
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    
    // First, verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
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
      }
    });

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
      }
    });

    const soldDividedItems = await prisma.divided.findMany({
      where: {
        orderNo: order.orderNo,
        isSold: true,
      },
      select: {
        id: true,
        barcodeId: true,
      }
    });

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

    return NextResponse.json({ 
      items: scanStatusArray
    });
  } catch (error) {
    console.error("Error fetching scan status:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan status" }, 
      { status: 500 }
    );
  }
} 