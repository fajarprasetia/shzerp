import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const order = await prisma.order.findUnique({
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
          where: { id: id },
      include: {
        customer: true,
        orderItems: {
          include: {
            stock: true,
            divided: true,
          },
        },
      },
    });

    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { customerId, orderItems, note, totalAmount } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json({ error: "At least one order item is required" }, { status: 400 });
    }

    // Validate each order item
    for (const item of orderItems) {
      if (!item.type || !item.quantity || !item.price) {
        return NextResponse.json({ 
          error: "Each order item must have type, quantity, and price",
          details: item
        }, { status: 400 });
      }

      // Ensure numeric values are valid
      if (isNaN(Number(item.quantity)) || isNaN(Number(item.price)) || isNaN(Number(item.tax))) {
        return NextResponse.json({ 
          error: "Invalid numeric values in order item",
          details: item
        }, { status: 400 });
      }
    }

    // Validate totalAmount
    if (totalAmount !== undefined && isNaN(Number(totalAmount))) {
      return NextResponse.json({ error: "Invalid total amount" }, { status: 400 });
    }

    // First, check if the order exists and has any shipment items
    const existingOrder = await prisma.order.findUnique({
      where: { id: id },
      include: {
        orderItems: {
          include: {
            shipmentItems: true
          }
        }
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if any order items have associated shipment items
    const hasShipmentItems = existingOrder.orderItems.some(item => item.shipmentItems.length > 0);
    
    if (hasShipmentItems) {
      return NextResponse.json({ 
        error: "Cannot update order that has been shipped. Please create a new order instead.",
        details: "Order items are referenced by shipment items"
      }, { status: 400 });
    }

    // If we get here, we can safely update the order
    const order = await prisma.order.update({
      where: { id: id },
      data: {
        customerId,
        note: note || null,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        orderItems: {
          deleteMany: {},
          create: orderItems.map((item: any) => ({
            type: item.type,
            product: item.product || null,
            gsm: item.gsm || null,
            width: item.width || null,
            length: item.length || null,
            weight: item.weight || null,
            quantity: Number(item.quantity),
            price: Number(item.price),
            tax: Number(item.tax || 0),
            stockId: item.stockId || null,
            dividedId: item.dividedId || null,
          })),
        },
      },
      include: {
        customer: true,
        orderItems: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_PUT]", error);
    return NextResponse.json(
      { 
        error: "Failed to update order",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Find the order with all related records
    const existingOrder = await prisma.order.findUnique({
      where: { id: id },
      include: {
        orderItems: {
          include: {
            shipmentItems: {
              include: {
                shipment: true
              }
            },
            stock: true,
            divided: true
          }
        },
        invoices: {
          include: {
            accountsReceivable: true
          }
        },
        shipment: true
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log(`Preparing to delete order ${existingOrder.orderNo} with cascade deletion`);

    // Start a transaction for all deletion operations to ensure consistency
    await prisma.$transaction(async (tx) => {
      // 1. Handle shipment items and revert inventory changes
      if (existingOrder.shipment) {
        console.log(`Handling shipment deletion for order ${existingOrder.orderNo}`);
        
        // Track all shipment items with scanned inventory
        for (const orderItem of existingOrder.orderItems) {
          for (const shipmentItem of orderItem.shipmentItems) {
            // Reset the sold status of any inventory items
            if (shipmentItem.stockId) {
              console.log(`Reverting stock sold status for stock ID: ${shipmentItem.stockId}`);
              await tx.stock.update({
                where: { id: shipmentItem.stockId },
                data: { 
                  isSold: false,
                  soldDate: null
                }
              });
            }
            
            if (shipmentItem.dividedId) {
              console.log(`Reverting divided stock sold status for divided ID: ${shipmentItem.dividedId}`);
              await tx.divided.update({
                where: { id: shipmentItem.dividedId },
                data: { 
                  isSold: false,
                  soldDate: null
                }
              });
            }
          }
        }
        
        // Delete all shipment items
        await tx.shipmentItem.deleteMany({
          where: { 
            shipmentId: existingOrder.shipment.id
          }
        });
        
        // Delete the shipment
        await tx.shipment.delete({
          where: { id: existingOrder.shipment.id }
        });
        
        console.log(`Shipment and related items deleted successfully`);
      }
      
      // 2. Handle invoices and accounts receivable
      for (const invoice of existingOrder.invoices) {
        console.log(`Handling invoice deletion for invoice ${invoice.invoiceNo}`);
        
        // If this invoice has an AR record, update the AR totals
        if (invoice.accountsReceivableId) {
          const arRecord = invoice.accountsReceivable;
          
          // Only update AR if it exists and isn't being deleted (might be shared with other invoices)
          if (arRecord) {
            const newTotal = Math.max(0, arRecord.totalAmount - invoice.totalAmount);
            const newPaid = Math.max(0, arRecord.paidAmount - (invoice.paymentStatus === 'PAID' ? invoice.totalAmount : 0));
            
            // Only update AR if there would be a remaining balance, otherwise delete it
            if (newTotal > 0) {
              console.log(`Updating accounts receivable: ID=${arRecord.id}, new total=${newTotal}`);
              await tx.accountsReceivable.update({
                where: { id: arRecord.id },
                data: {
                  totalAmount: newTotal,
                  paidAmount: newPaid,
                  status: newPaid >= newTotal ? 'CLOSED' : 'OPEN'
                }
              });
            } else {
              console.log(`Deleting accounts receivable: ID=${arRecord.id}`);
              await tx.accountsReceivable.delete({
                where: { id: arRecord.id }
              });
            }
          }
        }
        
        // Delete the invoice
        await tx.invoice.delete({
          where: { id: invoice.id }
        });
        
        console.log(`Invoice ${invoice.invoiceNo} deleted successfully`);
      }
      
      // 3. Handle journal entries if present
      if (existingOrder.journalEntryId) {
        console.log(`Deleting journal entry for order: ${existingOrder.journalEntryId}`);
        
        // First delete journal entry items
        await tx.journalEntryItem.deleteMany({
          where: { journalEntryId: existingOrder.journalEntryId }
        });
        
        // Then delete the journal entry
        await tx.journalEntry.delete({
          where: { id: existingOrder.journalEntryId }
        });
        
        console.log(`Journal entry deleted successfully`);
      }
      
      // 4. Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId: id }
      });
      
      console.log(`Order items deleted successfully`);
      
      // 5. Finally delete the order itself
      await tx.order.delete({
        where: { id: id }
      });
      
      console.log(`Order ${existingOrder.orderNo} deleted successfully`);
    });

    return NextResponse.json({ 
      success: true,
      message: `Order ${existingOrder.orderNo} and all related records deleted successfully`
    });
    
  } catch (error) {
    console.error("[ORDER_DELETE]", error);
    return NextResponse.json({ 
      error: "Failed to delete order",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 