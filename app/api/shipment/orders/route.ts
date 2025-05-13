import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    // Validate user session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search') || '';
    
    // Calculate pagination
    const skip = (page - 1) * pageSize;
    
    // Build search filters
    const searchFilter: Prisma.OrderWhereInput = search
      ? {
          OR: [
            { orderNo: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { customer: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ],
        }
      : {};
    
    // First get all orders with completed shipments
    const ordersWithCompletedShipment = await prisma.shipment.findMany({
      where: {
        status: "COMPLETED" as any
      },
      select: {
        orderId: true
      }
    });
    
    // Extract the order IDs with completed shipments
    const completedOrderIds = ordersWithCompletedShipment.map(ship => ship.orderId);
    
    // Find orders that don't have completed shipments
    const orders = await prisma.order.findMany({
      where: {
        id: {
          notIn: completedOrderIds.length > 0 ? completedOrderIds : undefined
        },
        ...searchFilter,
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            type: true,
            product: true,
            gsm: true,
            width: true,
            length: true,
            weight: true,
            quantity: true,
            stockId: true,
            dividedId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    });
    
    // Count with the same filter
    const totalOrders = await prisma.order.count({
      where: {
        id: {
          notIn: completedOrderIds.length > 0 ? completedOrderIds : undefined
        },
        ...searchFilter,
      },
    });
    
    const totalPages = Math.ceil(totalOrders / pageSize);
    
    return NextResponse.json({
      orders,
      totalItems: totalOrders,
      totalPages,
      currentPage: page,
    });
    
  } catch (error) {
    console.error('[SHIPMENT_ORDERS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders for shipment' },
      { status: 500 }
    );
  }
}

// Get a specific order by ID
export async function POST(req: NextRequest) {
  try {
    // Validate user session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get order ID from request body
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Check if this order already has a shipment in progress
    const existingShipment = await prisma.shipment.findFirst({
      where: { 
        orderId: id,
        status: "COMPLETED" as any
      }
    });
    
    // If there's a completed shipment, the order has already been shipped
    if (existingShipment) {
      return NextResponse.json(
        { error: 'Order has already been shipped' },
        { status: 400 }
      );
    }
    
    // Fetch the order with customer and items
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            type: true,
            product: true,
            gsm: true,
            width: true,
            length: true,
            weight: true,
            quantity: true,
            stockId: true,
            dividedId: true,
          },
        }
      },
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ order });
    
  } catch (error) {
    console.error('[SHIPMENT_ORDER_POST]', error);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
} 