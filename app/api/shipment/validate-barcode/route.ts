import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { orderId, barcodeValue } = await req.json();

    // Validate request
    if (!orderId || !barcodeValue) {
      return NextResponse.json({
        error: "Order ID and barcode value are required",
        matched: false
      }, { status: 400 });
    }

    // Fetch order with orderItems and customer information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            stock: true,
            divided: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({
        error: "Order not found",
        matched: false
      }, { status: 404 });
    }

    // Find inventory item matching the barcode
    const stockItem = await prisma.stock.findFirst({
      where: {
        barcodeId: barcodeValue,
        isSold: false
      }
    });

    const dividedItem = await prisma.divided.findFirst({
      where: {
        barcodeId: barcodeValue,
        isSold: false
      }
    });

    // No matching inventory item found
    if (!stockItem && !dividedItem) {
      return NextResponse.json({
        error: "No inventory item found with this barcode or item has already been sold",
        matched: false
      }, { status: 400 });
    }

    // Extract item details
    const inventoryItem = stockItem || dividedItem;
    const itemType = stockItem ? "stock" : "divided";
    
    // Get the specs to match with order items
    const itemSpecs = stockItem ? {
      type: stockItem.type,
      gsm: stockItem.gsm,
      width: stockItem.width,
      weight: stockItem.weight
    } : {
      type: (await prisma.stock.findUnique({ where: { id: dividedItem!.stockId } }))?.type || "",
      gsm: (await prisma.stock.findUnique({ where: { id: dividedItem!.stockId } }))?.gsm || 0,
      width: dividedItem!.width,
      weight: dividedItem!.weight || 0
    };

    // Find matching order item
    let matchedOrderItem = null;
    
    for (const orderItem of order.orderItems) {
      // Skip items that are fully scanned
      // This check will be handled in the frontend to allow rescanning (for replacing items)
      
      // Match specs
      const specMatch = 
        (orderItem.type === itemSpecs.type || !orderItem.type) &&
        (Math.abs(Number(orderItem.gsm) - itemSpecs.gsm) < 0.01 || !orderItem.gsm) &&
        (Math.abs(Number(orderItem.width) - itemSpecs.width) < 0.01 || !orderItem.width);
      
      if (specMatch) {
        matchedOrderItem = orderItem;
        break;
      }
    }

    if (!matchedOrderItem) {
      return NextResponse.json({
        error: "No matching order item found for this inventory item",
        matched: false
      }, { status: 400 });
    }

    // Mark the item as sold immediately when it's matched successfully
    // This is the key change to fix the issue
    try {
      // Update stock or divided item
      if (stockItem) {
        await prisma.stock.update({
          where: { id: stockItem.id },
          data: {
            isSold: true,
            orderNo: order.orderNo,
            soldDate: new Date(),
            customerName: order.customer.name
          }
        });
        console.log(`[VALIDATE_BARCODE] Marked stock ${stockItem.id} as sold for order ${order.orderNo}`);
      } else if (dividedItem) {
        await prisma.divided.update({
          where: { id: dividedItem.id },
          data: {
            isSold: true,
            orderNo: order.orderNo,
            soldDate: new Date(),
            customerName: order.customer.name
          }
        });
        console.log(`[VALIDATE_BARCODE] Marked divided stock ${dividedItem.id} as sold for order ${order.orderNo}`);
      }
    } catch (updateError) {
      console.error('[VALIDATE_BARCODE] Error marking item as sold:', updateError);
      // Don't fail the response, just log the error
    }

    // Success response
    return NextResponse.json({
      message: "Barcode matched successfully",
      matched: true,
      item: {
        id: matchedOrderItem.id,
        type: matchedOrderItem.type,
        product: matchedOrderItem.product,
        quantity: matchedOrderItem.quantity
      },
      orderItem: {
        id: matchedOrderItem.id,
        quantity: matchedOrderItem.quantity
      },
      stock: stockItem,
      divided: dividedItem,
      inventoryItem: {
        id: inventoryItem!.id,
        type: itemType,
        barcode: barcodeValue,
        specs: itemSpecs
      }
    });

  } catch (error) {
    console.error("Error validating barcode:", error);
    return NextResponse.json({
      error: "Internal server error",
      matched: false,
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 