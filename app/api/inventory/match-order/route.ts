import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Export configuration to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Define typings for the response items
interface StockItem {
  id: string;
  barcodeId: string;
  jumboRollNo: string | null;
  type: string | null;
  gsm: number | null;
  width: number | null;
  length: number | null;
  isSold: boolean;
  customerName: string | null;
  soldDate: Date | null;
  matchReason?: string;
}

interface DividedItem {
  id: string;
  barcodeId: string;
  rollNo: string | null;
  stockId: string | null;
  width: number | null;
  length: number | null;
  isSold: boolean;
  customerName: string | null;
  soldDate: Date | null;
  matchReason?: string;
}

/**
 * API endpoint to find Stock and Divided items that match a specific order number
 * Used by the Process Shipment page to pre-populate scanned items
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderNo = url.searchParams.get('orderNo');
    
    if (!orderNo) {
      return NextResponse.json(
        { error: "orderNo parameter is required" },
        { status: 400 }
      );
    }
    
    console.log(`[MATCH_ORDER] Finding inventory items matching order number: ${orderNo}`);
    
    // Find stock items associated with this order - ONLY include items that are marked as sold
    const stockItems = await prisma.stock.findMany({
      where: {
        orderNo: orderNo,
        isSold: true, // Only include items that are marked as sold
      },
      select: {
        id: true,
        barcodeId: true,
        jumboRollNo: true,
        type: true,
        gsm: true,
        width: true,
        length: true,
        isSold: true,
        customerName: true,
        soldDate: true
      }
    });
    
    console.log(`[MATCH_ORDER] Found ${stockItems.length} sold stock items with orderNo: ${orderNo}`);
    
    // Find divided items associated with this order - ONLY include items that are marked as sold
    const dividedItems = await prisma.divided.findMany({
      where: {
        orderNo: orderNo,
        isSold: true, // Only include items that are marked as sold
      },
      select: {
        id: true,
        barcodeId: true,
        rollNo: true,
        stockId: true,
        width: true,
        length: true,
        isSold: true,
        customerName: true,
        soldDate: true
      }
    });
    
    console.log(`[MATCH_ORDER] Found ${dividedItems.length} sold divided items with orderNo: ${orderNo}`);
    
    // Find the order to get all order items
    const order = await prisma.order.findFirst({
      where: {
        orderNo: orderNo,
      },
      include: {
        orderItems: true,
      },
    });
    
    if (!order) {
      console.log(`[MATCH_ORDER] No order found with orderNo: ${orderNo}`);
      return NextResponse.json({
        stockItems: [],
        dividedItems: [],
        orderItems: []
      });
    }

    console.log(`[MATCH_ORDER] Order found: ${order.id}, with ${order.orderItems.length} items`);
    
    // Cast the results to properly typed arrays
    let typedStockItems: StockItem[] = stockItems;
    let typedDividedItems: DividedItem[] = dividedItems;
    
    // If we didn't find any divided items directly by orderNo,
    // try to find divided items that might be associated with this order's items,
    // but ONLY if they are marked as sold
    if (dividedItems.length === 0 && order?.orderItems) {
      console.log(`[MATCH_ORDER] No divided items found directly. Trying to find sold items by order item dividedId...`);
      
      // Extract all dividedIds from order items
      const dividedIds = order.orderItems
        .filter(item => item.dividedId)
        .map(item => item.dividedId)
        .filter((id): id is string => id !== null && id !== undefined);
      
      if (dividedIds.length > 0) {
        console.log(`[MATCH_ORDER] Looking for sold divided items with ids: ${dividedIds.join(', ')}`);
        
        const relatedDividedItems = await prisma.divided.findMany({
          where: {
            id: {
              in: dividedIds
            },
            isSold: true // Only include items that are marked as sold
          },
          select: {
            id: true,
            barcodeId: true,
            rollNo: true,
            stockId: true,
            width: true,
            length: true,
            isSold: true,
            customerName: true,
            soldDate: true
          }
        });
        
        console.log(`[MATCH_ORDER] Found ${relatedDividedItems.length} sold divided items by order item relation`);
        
        // Add these to our results with proper typing
        typedDividedItems = [...typedDividedItems, ...relatedDividedItems];
      }
      
      // Try looking for items by the items already in the ShipmentItem table
      if (typedDividedItems.length === 0) {
        console.log(`[MATCH_ORDER] Looking for items in ShipmentItem related to this order`);
        
        // Find any shipment items associated with this order
        const shipmentItems = await prisma.shipment.findFirst({
          where: {
            orderId: order.id
          },
          include: {
            shipmentItems: {
              include: {
                divided: {
                  where: {
                    isSold: true // Only include divided items that are marked as sold
                  }
                },
                stock: {
                  where: {
                    isSold: true // Only include stock items that are marked as sold
                  }
                }
              }
            }
          }
        });
        
        if (shipmentItems && shipmentItems.shipmentItems.length > 0) {
          console.log(`[MATCH_ORDER] Found shipment with ${shipmentItems.shipmentItems.length} items`);
          
          // Add divided items from shipment
          const shipmentDividedItems = shipmentItems.shipmentItems
            .filter(item => item.divided)
            .map(item => item.divided);
            
          // Add stock items from shipment  
          const shipmentStockItems = shipmentItems.shipmentItems
            .filter(item => item.stock)
            .map(item => item.stock);
          
          // Add these items to our result sets
          if (shipmentDividedItems.length > 0) {
            console.log(`[MATCH_ORDER] Adding ${shipmentDividedItems.length} divided items from shipment records`);
            // Filter out null items, then map the non-null items
            const validDividedItems = shipmentDividedItems
              .filter((item): item is NonNullable<typeof item> => item !== null)
              .map(item => ({
                id: item.id,
                barcodeId: item.barcodeId,
                rollNo: item.rollNo,
                stockId: item.stockId,
                width: item.width,
                length: item.length,
                isSold: item.isSold,
                customerName: item.customerName,
                soldDate: item.soldDate
              }));
            typedDividedItems = [...typedDividedItems, ...validDividedItems];
          }
          
          if (shipmentStockItems.length > 0) {
            console.log(`[MATCH_ORDER] Adding ${shipmentStockItems.length} stock items from shipment records`);
            // Filter out null items, then map the non-null items
            const validStockItems = shipmentStockItems
              .filter((item): item is NonNullable<typeof item> => item !== null)
              .map(item => ({
                id: item.id,
                barcodeId: item.barcodeId,
                jumboRollNo: item.jumboRollNo,
                type: item.type,
                gsm: item.gsm,
                width: item.width,
                length: item.length,
                isSold: item.isSold,
                customerName: item.customerName,
                soldDate: item.soldDate
              }));
            typedStockItems = [...typedStockItems, ...validStockItems];
          }
        }
      }
      
      // If we still don't have any divided items, look for items by types - but only those marked as sold
      if (typedDividedItems.length === 0) {
        // Get all order items that look like they might be divided rolls
        const dividedTypeItems = order.orderItems.filter(item => 
          item.type.toLowerCase().includes('divided') || 
          item.type.toLowerCase().includes('roll') ||
          item.type.toLowerCase().includes('paper')
        );
        
        if (dividedTypeItems.length > 0) {
          console.log(`[MATCH_ORDER] Found ${dividedTypeItems.length} items with divided-like types`);
          
          // Try to find ANY divided items that might match by examining attributes
          const allDividedItems = await prisma.divided.findMany({
            where: {
              // Not limiting by ID since we're looking for ANY possible matches
              isSold: true, // Only include items that are already sold
              orderNo: orderNo // Must have matching order number
            },
            select: {
              id: true,
              barcodeId: true,
              rollNo: true,
              stockId: true,
              width: true,
              length: true,
              isSold: true,
              customerName: true,
              soldDate: true
            },
            take: 50 // Increase from 20 to ensure we get all matches
          });
          
          if (allDividedItems.length > 0) {
            console.log(`[MATCH_ORDER] Found ${allDividedItems.length} potential sold divided items to check`);
            
            // Mark these as being matched by type for debugging
            const markedItems = allDividedItems.map(item => ({
              ...item,
              matchReason: 'type-match'
            }));
            
            // Add these to the results for manual scanning and verification
            typedDividedItems = [...typedDividedItems, ...markedItems];
          }
        }
      }
    }
    
    // Remove duplicates from divided items by ID
    const uniqueDividedItems = Array.from(
      new Map(typedDividedItems.map(item => [item.id, item])).values()
    );
    
    // Remove duplicates from stock items by ID
    const uniqueStockItems = Array.from(
      new Map(typedStockItems.map(item => [item.id, item])).values()
    );
    
    console.log(`[MATCH_ORDER] Final result: ${uniqueStockItems.length} sold stock items, ${uniqueDividedItems.length} sold divided items, ${order.orderItems.length} order items`);
    
    return NextResponse.json({
      stockItems: uniqueStockItems,
      dividedItems: uniqueDividedItems,
      orderItems: order?.orderItems || []
    });
  } catch (error) {
    console.error("[MATCH_ORDER] Error finding inventory matches:", error);
    return NextResponse.json(
      { error: "Failed to retrieve inventory items" },
      { status: 500 }
    );
  }
} 