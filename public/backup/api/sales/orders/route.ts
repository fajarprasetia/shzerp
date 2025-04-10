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
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
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
    if (totalAmount === undefined || totalAmount === null) {
      console.log("Total amount not provided by client, calculating server-side");
      // Fallback calculation for backward compatibility
      totalAmount = 0;
      for (const item of body.orderItems) {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        totalAmount += price * quantity;
      }
    }
    console.log(`Using total amount: ${totalAmount}`);
    
    const orderItems = body.orderItems.map(item => {
      // Determine whether to use stockId or dividedId based on product type
      const isRoll = item.type === "Sublimation Paper" && item.product === "Roll";
      
      return {
        type: item.type,
        product: item.product || null,
        gsm: item.gsm || null,
        width: item.width || null,
        length: item.length || null,
        weight: item.weight || null,
        quantity: Number(item.quantity),
        price: Number(item.price),
        tax: Number(item.tax || 0),
        // Set the appropriate ID field based on product type
        stockId: isRoll ? null : item.productId || null,
        dividedId: isRoll ? item.productId || null : null
      };
    });

    // Generate order number (format: YYYYMMDD-XX where XX is sequence for the day)
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of orders for today to determine sequence
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    // Format sequence with leading zero
    const sequence = (ordersToday + 1).toString().padStart(2, '0');
    const orderNumber = `${dateString}-${sequence}`;

    // Create order in database
    const order = await prisma.order.create({
      data: {
        orderNo: orderNumber,
        customerId: body.customerId,
        totalAmount,
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

    // Update stock quantities in a try-catch block to prevent order failure
    for (const item of body.orderItems) {
      const quantity = Number(item.quantity);
      
      try {
        console.log(`Updating inventory for item: type=${item.type}, product=${item.product}, productId=${item.productId}`);
        
        // Check the item type to determine which table to update
        if (item.type === "Sublimation Paper") {
          // For Sublimation Paper, check the product subtype
          if (item.product === "Roll") {
            // Update divided stock table
            await prisma.divided.update({
              where: { id: item.productId },
              data: {
                remainingLength: {
                  decrement: quantity
                },
                isSold: true,
                orderNo: orderNumber,
                soldDate: new Date(),
                customerName: order.customer.name
              }
            });
            console.log(`Updated divided stock ${item.productId}, decremented by ${quantity}`);
          } else if (item.product === "Jumbo Roll") {
            // Update stock table
            await prisma.stock.update({
              where: { id: item.productId },
              data: {
                remainingLength: {
                  decrement: quantity
                },
                isSold: true,
                orderNo: orderNumber,
                soldDate: new Date(),
                customerName: order.customer.name
              }
            });
            console.log(`Updated stock ${item.productId}, decremented by ${quantity}`);
          } else {
            console.warn(`Unhandled Sublimation Paper product subtype: ${item.product}`);
          }
        } else {
          // For all other product types, try to update stock table
          try {
            await prisma.stock.update({
              where: { id: item.productId },
              data: {
                remainingLength: {
                  decrement: quantity
                },
                isSold: true,
                orderNo: orderNumber,
                soldDate: new Date(),
                customerName: order.customer.name
              }
            });
            console.log(`Updated stock ${item.productId}, decremented by ${quantity}`);
          } catch (stockError) {
            console.error(`Error updating stock, trying divided:`, stockError);
            // If stock update fails, try divided
            try {
              await prisma.divided.update({
                where: { id: item.productId },
                data: {
                  remainingLength: {
                    decrement: quantity
                  },
                  isSold: true,
                  orderNo: orderNumber,
                  soldDate: new Date(),
                  customerName: order.customer.name
                }
              });
              console.log(`Updated divided stock ${item.productId}, decremented by ${quantity}`);
            } catch (dividedError) {
              console.error(`Error updating divided stock:`, dividedError);
              console.error(`Could not update inventory for item: ${JSON.stringify(item)}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error updating inventory for item:`, item, error);
        // Don't throw here, we want to continue with the other items
      }
    }

    return NextResponse.json(order);
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
    
    // Update the order
    const order = await prisma.order.update({
      where: {
        id: data.id
      },
      data: {
        customerId: data.customerId,
        note: data.note,
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

    // Reset sold status on original items
    for (const item of originalOrder.orderItems) {
      if (item.stockId) {
        await prisma.stock.update({
          where: { id: item.stockId },
          data: {
            isSold: false,
            orderNo: null,
            soldDate: null,
            customerName: null
          }
        });
      }
      if (item.dividedId) {
        await prisma.divided.update({
          where: { id: item.dividedId },
          data: {
            isSold: false,
            orderNo: null,
            soldDate: null,
            customerName: null
          }
        });
      }
    }
    
    // Mark new items as sold
    for (const item of order.orderItems) {
      if (item.stockId) {
        await prisma.stock.update({
          where: { id: item.stockId },
          data: {
            isSold: true,
            orderNo: order.orderNo,
            soldDate: new Date(),
            customerName: order.customer.name
          }
        });
      }
      if (item.dividedId) {
        await prisma.divided.update({
          where: { id: item.dividedId },
          data: {
            isSold: true,
            orderNo: order.orderNo,
            soldDate: new Date(),
            customerName: order.customer.name
          }
        });
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to update order",
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
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

    await prisma.order.delete({
      where: { id },
    });

    revalidatePath("/sales/orders");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
} 