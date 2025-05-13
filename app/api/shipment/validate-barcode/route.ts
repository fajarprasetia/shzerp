import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, barcodeValue } = body;
    
    console.log(`[VALIDATE_BARCODE] Processing barcode: ${barcodeValue} for order: ${orderId}`);

    if (!orderId || !barcodeValue) {
      return NextResponse.json(
        { matched: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Find the order with customer info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: true,
      },
    });
    
    console.log(`[VALIDATE_BARCODE] Order found: ${!!order}, Order item count: ${order?.orderItems.length || 0}`);

    if (!order) {
      return NextResponse.json(
        { matched: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Check for stock or divided rolls with this barcode
    const stock = await prisma.stock.findUnique({
      where: { barcodeId: barcodeValue },
    });

    const divided = await prisma.divided.findUnique({
      where: { barcodeId: barcodeValue },
    });
    
    console.log(`[VALIDATE_BARCODE] Stock found: ${!!stock}, Divided found: ${!!divided}`);

    if (!stock && !divided) {
      return NextResponse.json({
        matched: false,
        error: "Barcode does not match any item in inventory",
      });
    }

    // Check if the item is already sold
    const isSold = stock?.isSold || divided?.isSold || false;
    
    // If it's sold, check if it's sold to THIS order
    const soldToThisOrder = 
      (stock?.orderNo === order.orderNo) || 
      (divided?.orderNo === order.orderNo);
    
    // If it's sold to a different order, reject the scan
    if (isSold && !soldToThisOrder) {
      return NextResponse.json({
        matched: false,
        error: "This item has already been sold to a different order",
      });
    }

    // Check if we've already scanned this barcode
    const existingShipmentItems = await prisma.shipmentItem.findMany({
      where: {
        scannedBarcode: barcodeValue,
        orderItem: {
          orderId: orderId
        }
      },
      include: {
        orderItem: true
      }
    });
    
    if (existingShipmentItems.length > 0) {
      console.log(`[VALIDATE_BARCODE] This barcode has already been scanned for this order (${existingShipmentItems.length} times)`);
      
      // Return success but mark it as already scanned
      return NextResponse.json({
        matched: true,
        alreadyScanned: true,
        item: existingShipmentItems[0].orderItem,
        stock,
        divided
      });
    }

    // Find a matching order item
    // First, try to match by stockId or dividedId if available
    const matchingItem = order.orderItems.find(
      (item) =>
        (stock && item.stockId === stock.id) ||
        (divided && (item.dividedId === divided.id || 
                    // Also check if the barcode itself is stored in the dividedId field
                    item.dividedId === divided.barcodeId))
    );
    
    console.log(`[VALIDATE_BARCODE] Direct ID match found: ${!!matchingItem}`);
    if (divided && !matchingItem) {
      // Log all dividedIds to help debug
      console.log(`[VALIDATE_BARCODE] Trying to match divided.id=${divided.id} with order items divided IDs:`, 
        order.orderItems.map(i => i.dividedId).join(', '));
    }
    if (stock) {
      console.log(`[VALIDATE_BARCODE] Stock ID: ${stock.id}, Stock type: ${stock.type}, GSM: ${stock.gsm}, Width: ${stock.width}`);
    }
    if (divided) {
      console.log(`[VALIDATE_BARCODE] Divided ID: ${divided.id}, Width: ${divided.width}, Length: ${divided.length}`);
    }

    // Log order items for debugging
    order.orderItems.forEach((item, index) => {
      console.log(`[VALIDATE_BARCODE] Order item ${index}: type=${item.type}, stockId=${item.stockId}, dividedId=${item.dividedId}, gsm=${item.gsm}, width=${item.width}, length=${item.length}`);
    });

    // If not matched by ID, try to match by type and specifications
    const typeMatchedItem = !matchingItem
      ? order.orderItems.find((item) => {
          if (stock) {
            // Make comparison less strict and case-insensitive
            const itemType = item.type?.toLowerCase();
            const stockType = stock.type?.toLowerCase();
            
            // Try to match by type first, with fallback options
            const typeMatches = 
              (itemType === stockType) || 
              (itemType?.includes(stockType) || stockType?.includes(itemType)) ||
              // Also match sublimation paper with common paper types
              (itemType?.includes("sublimation") && stockType?.includes("paper")) ||
              (stockType?.includes("sublimation") && itemType?.includes("paper"));
            
            console.log(`[VALIDATE_BARCODE] Enhanced stock type matching - itemType: ${itemType}, stockType: ${stockType}`);
            
            // For GSM, width, length - try to normalize to string and make optional
            const gsmMatches = !item.gsm || item.gsm === stock.gsm?.toString();
            
            // For width matching, try to be more lenient
            let widthMatches = !item.width; // If no width specified in order, consider it a match
            if (item.width) {
              const orderWidth = item.width.toString().replace(/[^0-9.]/g, '');
              const stockWidth = stock.width?.toString().replace(/[^0-9.]/g, '');
              widthMatches = !orderWidth || !stockWidth || orderWidth === stockWidth;
            }
            
            // Similar for length
            let lengthMatches = !item.length;
            if (item.length) {
              const orderLength = item.length.toString().replace(/[^0-9.]/g, '');
              const stockLength = stock.length?.toString().replace(/[^0-9.]/g, '');
              lengthMatches = !orderLength || !stockLength || orderLength === stockLength;
            }
            
            const matches = typeMatches && gsmMatches && widthMatches && lengthMatches;
            
            console.log(`[VALIDATE_BARCODE] Type match for item ${item.id}: ${matches}`);
            console.log(`[VALIDATE_BARCODE] Type comparison (${itemType} ~ ${stockType}): ${typeMatches}`);
            console.log(`[VALIDATE_BARCODE] GSM comparison: ${gsmMatches}`);
            console.log(`[VALIDATE_BARCODE] Width comparison: ${widthMatches}`);
            console.log(`[VALIDATE_BARCODE] Length comparison: ${lengthMatches}`);
            
            return matches;
          }
          if (divided) {
            // For divided items, we need to get the stock type from the parent stock
            const dividedParent = {
              type: "Divided", // Default type
              gsm: 0,
              width: divided.width,
              length: divided.length
            };
            
            // Make comparison less strict and case-insensitive
            const itemType = item.type?.toLowerCase();
            const dividedType = "divided"; // Default divided type is "Divided"
            
            // Try to match by type first, with flexible matching
            const typeMatches = 
              (itemType === dividedType) || 
              (itemType?.includes("divide") || itemType?.includes("cut")) ||
              // Add explicit match for sublimation paper types
              (itemType?.includes("sublimation") || itemType?.includes("paper") || itemType?.includes("roll"));
            
            console.log(`[VALIDATE_BARCODE] Enhanced type matching - itemType: ${itemType}, includes 'sublimation': ${itemType?.includes("sublimation")}, includes 'paper': ${itemType?.includes("paper")}, includes 'roll': ${itemType?.includes("roll")}`);
            
            // GSM is less important for divided items
            const gsmMatches = true; // Skip GSM matching for divided items
            
            // For width matching, try to be more lenient
            let widthMatches = !item.width; // If no width specified in order, consider it a match
            if (item.width) {
              const orderWidth = item.width.toString().replace(/[^0-9.]/g, '');
              const dividedWidth = divided.width?.toString().replace(/[^0-9.]/g, '');
              widthMatches = !orderWidth || !dividedWidth || orderWidth === dividedWidth;
            }
            
            // Similar for length
            let lengthMatches = !item.length;
            if (item.length) {
              const orderLength = item.length.toString().replace(/[^0-9.]/g, '');
              const dividedLength = divided.length?.toString().replace(/[^0-9.]/g, '');
              lengthMatches = !orderLength || !dividedLength || orderLength === dividedLength;
            }
            
            const matches = typeMatches && gsmMatches && widthMatches && lengthMatches;
            
            console.log(`[VALIDATE_BARCODE] Divided match for item ${item.id}: ${matches}`);
            console.log(`[VALIDATE_BARCODE] Type comparison (${itemType} ~ divided): ${typeMatches}`);
            console.log(`[VALIDATE_BARCODE] Width comparison: ${widthMatches}`);
            console.log(`[VALIDATE_BARCODE] Length comparison: ${lengthMatches}`);
            
            return matches;
          }
          return false;
        })
      : null;
      
    console.log(`[VALIDATE_BARCODE] Type-matched item found: ${!!typeMatchedItem}`);

    // If we still don't have a match, try any order item that has a matching type
    const anyTypeItem = !matchingItem && !typeMatchedItem 
      ? order.orderItems.find((item) => {
          const itemType = item.type?.toLowerCase();
          // For stock items
          if (stock) {
            const stockType = stock.type?.toLowerCase();
            return stockType && itemType && (
              itemType.includes(stockType) || 
              stockType.includes(itemType) ||
              (itemType.includes("paper") && stockType.includes("paper"))
            );
          }
          // For divided items, match any paper, roll, or divided types
          if (divided) {
            return itemType && (
              itemType.includes("paper") || 
              itemType.includes("roll") || 
              itemType.includes("divide")
            );
          }
          return false;
        })
      : null;
    
    console.log(`[VALIDATE_BARCODE] Fallback type match found: ${!!anyTypeItem}`);

    // If we still don't have a match, use the first order item as last resort
    const finalItem = matchingItem || typeMatchedItem || anyTypeItem || order.orderItems[0];
    
    // If we're using a fallback match, update the order item with the stock/divided IDs for future reference
    if (!matchingItem && finalItem) {
      try {
        if (stock) {
          await prisma.orderItem.update({
            where: { id: finalItem.id },
            data: { stockId: stock.id }
          });
          console.log(`[VALIDATE_BARCODE] Updated order item ${finalItem.id} with stockId ${stock.id}`);
        }
        
        if (divided) {
          await prisma.orderItem.update({
            where: { id: finalItem.id },
            data: { dividedId: divided.id }
          });
          console.log(`[VALIDATE_BARCODE] Updated order item ${finalItem.id} with dividedId ${divided.id}`);
        }
      } catch (updateError) {
        console.error('[VALIDATE_BARCODE] Error updating order item:', updateError);
        // Continue anyway, this is just a helper update
      }
    }

    const matchType = matchingItem ? 'exact' : typeMatchedItem ? 'type' : anyTypeItem ? 'fallback' : 'default';
    console.log(`[VALIDATE_BARCODE] Final match type: ${matchType}, item type: ${finalItem.type}`);

    // Return the validation result with additional information
    return NextResponse.json({
      matched: true,
      matchType,
      item: finalItem,
      stock: stock,
      divided: divided
    });
  } catch (error) {
    console.error('[VALIDATE_BARCODE] Error validating barcode:', error);
    return NextResponse.json(
      { matched: false, error: "An error occurred while validating the barcode" },
      { status: 500 }
    );
  }
}