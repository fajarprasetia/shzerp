import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface ScannedItem {
  orderItemId: string;
  barcode: string;
  stockId?: string | null;
  dividedId?: string | null;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderItems, scannedItems, shipmentNotes } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Verify the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order has already been shipped
    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId },
    });

    if (existingShipment) {
      return NextResponse.json(
        { error: "This order has already been shipped" },
        { status: 400 }
      );
    }

    // Check if we have scanned items to process
    // First try the new format with explicit scannedItems array
    let itemsToProcess: ScannedItem[] = [];
    
    if (scannedItems && Array.isArray(scannedItems) && scannedItems.length > 0) {
      // Use the explicit scanned items array (new format)
      itemsToProcess = scannedItems;
    } else if (orderItems && Array.isArray(orderItems)) {
      // Fall back to deriving from orderItems with either scannedCount or scanned boolean
      // Look for items with scannedCount > 0 or scanned = true
      const processableItems = orderItems.filter(item => 
        (item.scannedCount && item.scannedCount > 0) || item.scanned
      );
      
      if (processableItems.length === 0) {
        return NextResponse.json(
          { error: "No items have been scanned for shipment" },
          { status: 400 }
        );
      }
      
      // Convert to the format needed for processing
      itemsToProcess = processableItems.map(item => ({
        orderItemId: item.id,
        barcode: item.barcodeId || item.rollNo || item.id, // Best effort to get a barcode
        stockId: item.stockId || null,
        dividedId: item.dividedId || null
      }));
    } else {
      return NextResponse.json(
        { error: "No valid items provided for shipment" },
        { status: 400 }
      );
    }
    
    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { error: "No items have been scanned for shipment" },
        { status: 400 }
      );
    }

    console.log("Processing shipment with items:", JSON.stringify(itemsToProcess));

    // Create the shipment record
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        shippedBy: session.user.id,
        shipmentDate: new Date(),
        notes: shipmentNotes || "",
        shipmentItems: {
          create: itemsToProcess.map(item => ({
            orderItemId: item.orderItemId,
            scannedBarcode: item.barcode,
            stockId: item.stockId,
            dividedId: item.dividedId
          })),
        },
      },
      include: {
        shipmentItems: true,
      },
    });

    // Update order status to "shipped"
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
      },
    });

    // Use Sets to track which items have been processed
    const updatedStockIds = new Set<string>();
    const updatedDividedIds = new Set<string>();
    const processedItems: { id: string, type: string, status: string }[] = [];

    // Process each item - ensuring it's marked as sold
    for (const item of itemsToProcess) {
      // Handle stock items
      if (item.stockId && !updatedStockIds.has(item.stockId)) {
        // Find the original order item to get quantity
        const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
        const quantity = orderItem ? Number(orderItem.quantity) || 0 : 0;
        
        // Check current status of stock
        const stock = await prisma.stock.findUnique({
          where: { id: item.stockId }
        });
        
        if (stock) {
          try {
            // Update data object based on current status
            const updateData: any = {
              remainingLength: {
                decrement: quantity
              }
            };
            
            // Only update sold-related fields if not already sold
            if (!stock.isSold) {
              updateData.isSold = true;
              updateData.orderNo = order.orderNo;
              updateData.soldDate = new Date();
              updateData.customerName = order.customer.name;
            }
            
            await prisma.stock.update({
              where: { id: item.stockId },
              data: updateData,
            });
            
            updatedStockIds.add(item.stockId);
            processedItems.push({ 
              id: item.stockId, 
              type: 'stock', 
              status: stock.isSold ? 'already sold, updated quantity' : 'marked as sold' 
            });
          } catch (error) {
            console.error(`Error updating stock ${item.stockId}:`, error);
          }
        } else {
          console.warn(`Stock item ${item.stockId} not found, skipping`);
        }
      }
      
      // Handle divided items
      if (item.dividedId && !updatedDividedIds.has(item.dividedId)) {
        // Find the original order item to get quantity
        const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
        const quantity = orderItem ? Number(orderItem.quantity) || 0 : 0;
        
        // Check current status of divided item
        const divided = await prisma.divided.findUnique({
          where: { id: item.dividedId }
        });
        
        if (divided) {
          try {
            // Update data object based on current status
            const updateData: any = {
              remainingLength: {
                decrement: quantity
              }
            };
            
            // Only update sold-related fields if not already sold
            if (!divided.isSold) {
              updateData.isSold = true;
              updateData.orderNo = order.orderNo;
              updateData.soldDate = new Date();
              updateData.customerName = order.customer.name;
            }
            
            await prisma.divided.update({
              where: { id: item.dividedId },
              data: updateData,
            });
            
            updatedDividedIds.add(item.dividedId);
            processedItems.push({ 
              id: item.dividedId, 
              type: 'divided', 
              status: divided.isSold ? 'already sold, updated quantity' : 'marked as sold' 
            });
          } catch (error) {
            console.error(`Error updating divided item ${item.dividedId}:`, error);
          }
        } else {
          console.warn(`Divided item ${item.dividedId} not found, skipping`);
        }
      }
    }
    
    console.log(`Processed Items:`, processedItems);
    console.log(`Updated dividedIds (${updatedDividedIds.size}):`, Array.from(updatedDividedIds));
    console.log(`Updated stockIds (${updatedStockIds.size}):`, Array.from(updatedStockIds));

    return NextResponse.json({
      success: true,
      message: `Shipment completed successfully for order ${order.orderNo}`,
      shipment: {
        id: shipment.id,
        orderId: order.id,
        orderNo: order.orderNo
      },
      processedItems
    });

  } catch (error) {
    console.error("[COMPLETE_SHIPMENT]", error);
    return NextResponse.json({ 
      error: "Failed to complete shipment", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 