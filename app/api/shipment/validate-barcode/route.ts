import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, barcodeValue } = body;

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

    // Find a matching order item
    // First, try to match by stockId or dividedId if available
    const matchingItem = order.orderItems.find(
      (item) =>
        (stock && item.stockId === stock.id) ||
        (divided && item.dividedId === divided.id)
    );

    // If not matched by ID, try to match by type and specifications
    const typeMatchedItem = !matchingItem
      ? order.orderItems.find((item) => {
          if (stock) {
            return (
              item.type === stock.type &&
              (!item.gsm || item.gsm === stock.gsm.toString()) &&
              (!item.width || item.width === stock.width.toString()) &&
              (!item.length || item.length === stock.length.toString())
            );
          }
          if (divided) {
            // For divided items, we need to get the stock type from the parent stock
            const dividedParent = {
              type: "Divided", // Default type
              gsm: 0,
              width: divided.width,
              length: divided.length
            };
            
            return (
              item.type === "Divided" &&
              (!item.gsm || item.gsm === dividedParent.gsm.toString()) &&
              (!item.width || item.width === divided.width.toString()) &&
              (!item.length || item.length === divided.length.toString())
            );
          }
          return false;
        })
      : null;

    // Check for existing shipment item records with this barcode
    // This helps us track if this specific item was already scanned
    const existingShipmentItem = await prisma.shipmentItem.findFirst({
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

    if (existingShipmentItem) {
      // If we find a shipment item record, this barcode was already scanned for this order
      return NextResponse.json({
        matched: true,
        item: existingShipmentItem.orderItem,
        alreadyScanned: true,
        stock: stock,
        divided: divided,
        message: "This item was already scanned for this order"
      });
    }

    const item = matchingItem || typeMatchedItem;

    if (!item) {
      return NextResponse.json({
        matched: false,
        error: "No matching item found in this order",
      });
    }

    // Mark the item as sold immediately when it's matched successfully
    // This ensures that if the page is refreshed, we can detect already-scanned items
    try {
      // Update stock or divided item
      if (stock && !stock.isSold) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: {
            isSold: true,
            orderNo: order.orderNo,
            soldDate: new Date(),
            customerName: order.customer.name
          }
        });
        console.log(`[VALIDATE_BARCODE] Marked stock ${stock.id} as sold for order ${order.orderNo}`);
      } else if (divided && !divided.isSold) {
        await prisma.divided.update({
          where: { id: divided.id },
          data: {
            isSold: true,
            orderNo: order.orderNo,
            soldDate: new Date(),
            customerName: order.customer.name
          }
        });
        console.log(`[VALIDATE_BARCODE] Marked divided stock ${divided.id} as sold for order ${order.orderNo}`);
      }
    } catch (updateError) {
      console.error('[VALIDATE_BARCODE] Error marking item as sold:', updateError);
      // Don't fail the response, just log the error
    }

    // At this point we have a valid match
    return NextResponse.json({
      matched: true,
      item,
      stock,
      divided,
      message: "Barcode matched successfully"
    });
  } catch (error) {
    console.error("Error validating barcode:", error);
    return NextResponse.json(
      { matched: false, error: "Failed to validate barcode" },
      { status: 500 }
    );
  }
}