import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface OrderItem {
  type: string;
  product?: string;
  gsm?: number;
  width?: number;
  length?: number;
  weight?: number;
  quantity?: number;
  price: number;
  tax: number;
  stockId?: string;
  dividedId?: string;
}

interface CreateOrderRequest {
  customerId: string;
  marketingId?: string;
  orderItems: {
    type: string;
    product?: string;
    productId?: string;
    gsm?: string;
    width?: string;
    length?: string;
    weight?: string;
    quantity: number | string;
    price: number | string;
    tax?: number | string;
  }[];
  note?: string;
  totalAmount?: number;
  discount?: number;
  discountType?: "percentage" | "value";
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        marketing: true,
        orderItems: {
          include: {
            stock: true,
            divided: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Map orders to include the first order item's type
    const mappedOrders = orders.map(order => ({
      ...order,
      type: order.orderItems[0]?.type || "N/A"
    }));

    return NextResponse.json(mappedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as CreateOrderRequest;
    console.log("Received order data:", JSON.stringify(body, null, 2));

    // Validate required fields with detailed logging
    if (!body.customerId) {
      console.error("Customer ID is missing in request:", body);
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    
    if (!body.orderItems || body.orderItems.length === 0) {
      console.error("Order items are missing or empty:", body);
      return NextResponse.json({ error: "Order items are required" }, { status: 400 });
    }
    
    // Validate discount if provided
    if (body.discount !== undefined && body.discount !== null) {
      const discount = Number(body.discount);
      
      if (isNaN(discount) || discount < 0) {
        console.error(`Invalid discount value received: ${body.discount}`);
        return NextResponse.json({ error: "Discount must be a non-negative number" }, { status: 400 });
      }
      
      // Additional validation for percentage discounts
      if (body.discountType !== "value" && discount > 100) {
        console.error(`Invalid percentage discount received: ${body.discount}`);
        return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
      }
    }
    
    // Validate each order item with detailed logging
    for (const item of body.orderItems) {
      console.log("Validating order item:", JSON.stringify(item, null, 2));
      
      if (!item.type) {
        console.error("Type is missing in order item:", item);
        return NextResponse.json({ error: "Type is required for all order items" }, { status: 400 });
      }
      if (!item.productId) {
        console.error("ProductId is missing in order item:", item);
        return NextResponse.json({ 
          error: "Product ID is required for all order items", 
          item: item,
          details: "Make sure to select valid product options that match inventory items"
        }, { status: 400 });
      }
      if (item.price === undefined || item.price === null) {
        console.error("Price is missing in order item:", item);
        return NextResponse.json({ error: "Price is required for all order items" }, { status: 400 });
      }
      if (item.quantity === undefined || item.quantity === null) {
        console.error("Quantity is missing in order item:", item);
        return NextResponse.json({ error: "Quantity is required for all order items" }, { status: 400 });
      }
    }

    // Use the totalAmount sent by the client, or calculate it if not provided
    let totalAmount = body.totalAmount;
    
    // Validate that totalAmount is a valid number if provided
    if (totalAmount !== undefined && totalAmount !== null) {
      if (isNaN(Number(totalAmount))) {
        console.error(`Invalid totalAmount received: ${totalAmount}`);
        return NextResponse.json({ error: "Invalid total amount value" }, { status: 400 });
      }
      // Ensure it's a number type (not a string)
      totalAmount = Number(totalAmount);
      console.log(`Received valid totalAmount: ${totalAmount} (type: ${typeof totalAmount})`);
    } else {
      console.log("Total amount not provided by client, calculating server-side");
      // Fallback calculation for backward compatibility
      totalAmount = 0;
      for (const item of body.orderItems) {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        totalAmount += price * quantity;
      }
      console.log(`Calculated fallback totalAmount: ${totalAmount}`);
    }
    
    // Apply discount if provided
    if (body.discount) {
      const discount = Number(body.discount);
      
      // Apply discount based on the discount type
      if (body.discountType === "value") {
        // Value-based discount: directly subtract the amount
        totalAmount = totalAmount - discount;
        console.log(`Applied value discount of ${discount}, new total: ${totalAmount}`);
      } else {
        // Percentage-based discount (default)
        totalAmount = totalAmount - (totalAmount * (discount / 100));
        console.log(`Applied percentage discount of ${discount}%, new total: ${totalAmount}`);
      }
      
      // Ensure total amount is not negative
      if (totalAmount < 0) totalAmount = 0;
    }
    
    console.log(`Final totalAmount to be saved: ${totalAmount} (type: ${typeof totalAmount})`);
    
    const orderItems = body.orderItems.map(item => {
      // Determine whether to use stockId or dividedId based on product type
      const isRoll = item.type === "Sublimation Paper" && item.product === "Roll";
      
      return {
        type: item.type,
        product: item.product || null,
        gsm: item.gsm !== undefined && item.gsm !== null ? String(item.gsm) : null,
        width: item.width !== undefined && item.width !== null ? String(item.width) : null,
        length: item.length !== undefined && item.length !== null ? String(item.length) : null,
        weight: item.weight !== undefined && item.weight !== null ? String(item.weight) : null,
        quantity: Number(item.quantity),
        price: Number(item.price),
        tax: Number(item.tax || 0),
        // Set the appropriate ID field based on product type
        stockId: isRoll ? null : item.productId || null,
        dividedId: isRoll ? item.productId || null : null
      };
    });

    // Generate a unique order number using the SO-YYYYMMDDXXX format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePrefix = `SO-${year}${month}${day}`;
    
    // Get all orders with today's prefix to find the highest sequence number
    const existingOrders = await prisma.order.findMany({
      where: {
        orderNo: {
          startsWith: datePrefix
        }
      },
      orderBy: {
        orderNo: "desc" // Sort by desc to get highest sequence first
      }
    });
    
    // Find the highest sequence number used today
    let nextSequence = 1;
    const usedSequences = new Set<number>();
    
    if (existingOrders.length > 0) {
      // Process all existing order numbers to build a complete set of used sequences
      existingOrders.forEach(order => {
        try {
          const sequencePart = order.orderNo.split('-')[2];
          if (sequencePart && /^\d{3}$/.test(sequencePart)) {
            const seq = parseInt(sequencePart, 10);
            usedSequences.add(seq);
            // Keep track of the highest sequence
            if (seq >= nextSequence) {
              nextSequence = seq + 1;
            }
          }
        } catch (error) {
          console.warn('Could not parse order number:', order.orderNo);
        }
      });
    }
    
    // Safety check to find an available sequence number
    while (usedSequences.has(nextSequence) && nextSequence <= 999) {
      nextSequence++;
    }
    
    // If we hit 999, roll over to use alphabetic suffixes (A001, B001, etc.)
    let orderNumber = '';
    let prefix = '';
    
    if (nextSequence > 999) {
      // Find next available alphabetic prefix
      for (let charCode = 65; charCode <= 90; charCode++) { // A-Z
        prefix = String.fromCharCode(charCode);
        const alphaPrefix = `SO-${year}${month}${day}${prefix}`;
        
        // Check if any orders with this alpha prefix exist
        const alphaOrders = await prisma.order.findMany({
          where: {
            orderNo: {
              startsWith: alphaPrefix
            }
          },
          orderBy: {
            orderNo: "desc"
          }
        });
        
        if (alphaOrders.length === 0) {
          // No orders with this alpha prefix, use 001
          orderNumber = `${alphaPrefix}001`;
          break;
        } else {
          // Find the highest sequence for this alpha prefix
          try {
            const lastOrder = alphaOrders[0];
            const sequencePart = lastOrder.orderNo.substring(alphaPrefix.length);
            if (sequencePart && /^\d{3}$/.test(sequencePart)) {
              const seq = parseInt(sequencePart, 10) + 1;
              if (seq <= 999) {
                orderNumber = `${alphaPrefix}${String(seq).padStart(3, '0')}`;
                break;
              }
            }
          } catch (error) {
            console.warn('Could not parse alpha order number:', alphaOrders[0].orderNo);
          }
        }
      }
      
      // Fallback if all alphabetic prefixes are exhausted
      if (!orderNumber) {
        // Last resort - use timestamp suffix
        orderNumber = `${datePrefix}-${Date.now().toString().substring(8)}`;
      }
    } else {
      // Standard case - use next available sequence
      const sequenceFormatted = String(nextSequence).padStart(3, '0');
      orderNumber = `${datePrefix}${sequenceFormatted}`;
    }
    
    console.log(`Generated guaranteed unique order number: ${orderNumber}`);

    try {
      // Create order in database - wrapped in try/catch to handle unique constraint errors
      const order = await prisma.order.create({
        data: {
          orderNo: orderNumber,
          customerId: body.customerId,
          marketingId: body.marketingId || null,
          totalAmount,
          discount: body.discount ? Number(body.discount) : 0,
          discountType: body.discountType || "percentage",
          note: body.note || "",
          orderItems: {
            create: orderItems.map(item => ({
              type: item.type,
              product: item.product || null,
              gsm: item.gsm || null,
              width: item.width || null,
              length: item.length || null,
              weight: item.weight || null,
              quantity: item.quantity,
              price: item.price,
              tax: item.tax,
              stockId: item.stockId,
              dividedId: item.dividedId
            }))
          }
        },
        include: {
          orderItems: true,
          customer: true
        }
      });

      return NextResponse.json(order);
    } catch (error: any) {
      // Handle unique constraint errors specifically
      if (error.code === 'P2002' && error.meta?.target?.includes('orderNo')) {
        console.error(`Unique constraint error on orderNo: ${orderNumber}`);
        
        // Generate a truly unique fallback using timestamp
        const timestampOrderNumber = `${datePrefix}-${Date.now().toString().substring(8)}`;
        console.log(`Retrying with timestamp-based order number: ${timestampOrderNumber}`);
        
        // Final attempt with timestamp-based order number
        try {
          const order = await prisma.order.create({
            data: {
              orderNo: timestampOrderNumber,
              customerId: body.customerId,
              marketingId: body.marketingId || null,
              totalAmount,
              discount: body.discount ? Number(body.discount) : 0,
              discountType: body.discountType || "percentage",
              note: body.note || "",
              orderItems: {
                create: orderItems.map(item => ({
                  type: item.type,
                  product: item.product || null,
                  gsm: item.gsm || null,
                  width: item.width || null,
                  length: item.length || null,
                  weight: item.weight || null,
                  quantity: item.quantity,
                  price: item.price,
                  tax: item.tax,
                  stockId: item.stockId,
                  dividedId: item.dividedId
                }))
              }
            },
            include: {
              orderItems: true,
              customer: true
            }
          });
          return NextResponse.json(order);
        } catch (finalError: any) {
          console.error("Final attempt to create order failed:", finalError);
          throw new Error("Order number generation failed after multiple attempts. Please try again.");
        }
      }
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error instanceof Error ? error.message : "Unknown error" }, 
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    
    // Get original order
    const originalOrder = await prisma.order.findUnique({
      where: { id: data.id },
      include: {
        customer: true,
        orderItems: true
      }
    });
    
    if (!originalOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    
    // Validate discount if provided
    if (data.discount !== undefined && data.discount !== null) {
      const discount = Number(data.discount);
      
      if (isNaN(discount) || discount < 0) {
        console.error(`Invalid discount value received for update: ${data.discount}`);
        return NextResponse.json({ error: "Discount must be a non-negative number" }, { status: 400 });
      }
      
      // Additional validation for percentage discounts
      if (data.discountType !== "value" && discount > 100) {
        console.error(`Invalid percentage discount received for update: ${data.discount}`);
        return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
      }
    }
    
    // Use the totalAmount sent by the client, or keep the existing one
    let totalAmount;
    
    if (data.totalAmount !== undefined && data.totalAmount !== null) {
      // Validate that totalAmount is a valid number
      if (isNaN(Number(data.totalAmount))) {
        console.error(`Invalid totalAmount received for update: ${data.totalAmount}`);
        return NextResponse.json({ error: "Invalid total amount value" }, { status: 400 });
      }
      // Ensure it's a number type (not a string)
      totalAmount = Number(data.totalAmount);
      console.log(`Received valid totalAmount for update: ${totalAmount} (type: ${typeof totalAmount})`);
    } else {
      // Use original amount if not provided
      totalAmount = originalOrder.totalAmount;
    }

    // Apply discount if provided
    if (data.discount !== undefined && data.discount !== null) {
      const discount = Number(data.discount);
      
      // Apply discount based on the discount type
      if (data.discountType === "value") {
        // Value-based discount: directly subtract the amount
        totalAmount = totalAmount - discount;
        console.log(`Applied value discount of ${discount}, new total: ${totalAmount}`);
      } else {
        // Percentage-based discount (default)
        totalAmount = totalAmount - (totalAmount * (discount / 100));
        console.log(`Applied percentage discount of ${discount}%, new total: ${totalAmount}`);
      }
      
      // Ensure total amount is not negative
      if (totalAmount < 0) totalAmount = 0;
    }

    // Update order in database
    const updatedOrder = await prisma.order.update({
      where: { id: data.id },
      data: {
        totalAmount,
        discount: data.discount !== undefined ? Number(data.discount) : originalOrder.discount,
        discountType: data.discountType || originalOrder.discountType || "percentage",
        note: data.note || originalOrder.note,
        customerId: data.customerId,
        orderItems: {
          deleteMany: {},
          create: data.orderItems.map((item: any) => ({
            type: item.type,
            productId: item.productId,
            gsm: item.gsm,
            width: item.width,
            length: item.length,
            weight: item.weight,
            quantity: item.quantity,
            price: item.price,
            tax: item.tax,
            stockId: item.stockId,
            dividedId: item.dividedId,
          }))
        }
      },
      include: {
        customer: true,
        orderItems: true,
      }
    });

    // Don't update inventory at all - inventory will only be updated during shipment process
    // No need to reset or update any inventory fields when editing orders

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }
    
    // First, get the order with its items to find associated stock/divided IDs
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        customer: true
      }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }
    
    console.log(`Preparing to delete order ${order.orderNo} with ${order.orderItems.length} items`);
    
    // Use a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Only reset inventory for items that have actually been shipped and marked as sold
      for (const item of order.orderItems) {
        if (item.stockId) {
          // Get current stock to check if it was actually sold
          const stock = await tx.stock.findUnique({
            where: { id: item.stockId }
          });
          
          // Only update if it was marked as sold AND related to this order
          if (stock && stock.isSold && stock.orderNo === order.orderNo) {
            console.log(`Resetting sold status for stock item: ${item.stockId}`);
            await tx.stock.update({
              where: { id: item.stockId },
              data: {
                isSold: false,
                orderNo: null,
                soldDate: null,
                customerName: null,
                // Reset remaining length if it was shipped
                remainingLength: {
                  increment: item.quantity || 0
                }
              }
            });
          }
        }
        
        if (item.dividedId) {
          // Get current divided stock to check if it was actually sold
          const divided = await tx.divided.findUnique({
            where: { id: item.dividedId }
          });
          
          // Only update if it was marked as sold AND related to this order
          if (divided && divided.isSold && divided.orderNo === order.orderNo) {
            console.log(`Resetting sold status for divided stock item: ${item.dividedId}`);
            await tx.divided.update({
              where: { id: item.dividedId },
              data: {
                isSold: false,
                orderNo: null,
                soldDate: null,
                customerName: null,
                // Reset remaining length if it was shipped
                remainingLength: {
                  increment: item.quantity || 0
                }
              }
            });
          }
        }
      }

      // After resetting inventory status, delete the order
      await tx.order.delete({
        where: { id },
      });
    });
    
    console.log(`Successfully deleted order ${order.orderNo} and reset inventory status`);

    revalidatePath("/sales/orders");
    return NextResponse.json({ 
      success: true,
      message: `Order ${order.orderNo} deleted and inventory items made available again`,
      orderNo: order.orderNo
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 