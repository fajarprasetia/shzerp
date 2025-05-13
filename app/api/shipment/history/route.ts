import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    // Validate user session
    const user = await getCurrentUser();
    
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search') || '';
    const orderId = url.searchParams.get('orderId') || undefined;
    
    // Calculate pagination
    const skip = (page - 1) * pageSize;
    
    // Build search filters
    let searchFilter: any = search
      ? {
          OR: [
            { order: { orderNo: { contains: search, mode: 'insensitive' } } },
            { order: { customer: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {};
      
    // Add order ID filter if specified
    if (orderId) {
      searchFilter = {
        ...searchFilter,
        orderId: orderId
      };
    }
    
    // Fetch only COMPLETED shipments with related data
    const shipments = await prisma.shipment.findMany({
      where: {
        status: 'COMPLETED', // Only fetch completed shipments
        ...searchFilter,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                name: true,
                address: true,
              },
            },
            orderItems: {
              include: {
                stock: true,
                divided: true
              }
            }
          },
        },
        shipmentItems: {
          include: {
            orderItem: true,
            stock: true,
            divided: true
          }
        },
        shippedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    });
    
    // Format shipments for response
    const formattedShipments = shipments.map(shipment => {
      // Group and enhance items information
      const items = [];
      
      // Create a mapping of order item IDs to track what items are being shipped
      const orderItemMap = new Map();
      
      // First, process the order items to have the base data
      if (shipment.order.orderItems) {
        shipment.order.orderItems.forEach(item => {
          orderItemMap.set(item.id, item);
        });
      }
      
      // Process shipment items to get what was actually shipped
      const shippedOrderItemIds = new Set();
      
      shipment.shipmentItems.forEach(item => {
        if (item.orderItemId) {
          shippedOrderItemIds.add(item.orderItemId);
        }
      });
      
      // Only include order items that are associated with this shipment
      shippedOrderItemIds.forEach(orderItemId => {
        const orderItem = orderItemMap.get(orderItemId);
        if (orderItem) {
          let itemName = orderItem.type || 'Unknown';
          
          // Check if this item has an associated stock (jumbo roll)
          if (orderItem.stockId && orderItem.stock) {
            itemName = `${orderItem.type} - ${orderItem.stock.jumboRollNo}`;
          }
          
          // Check if this item has an associated divided roll
          if (orderItem.dividedId && orderItem.divided) {
            itemName = `${orderItem.type} - ${orderItem.divided.rollNo}`;
          }
          
          items.push({
            id: orderItem.id,
            name: itemName,
            quantity: orderItem.quantity || 1,
            type: orderItem.type
          });
        }
      });
      
      return {
        id: shipment.id,
        orderId: shipment.orderId,
        orderNo: shipment.order.orderNo,
        customerName: shipment.order.customer.name,
        address: shipment.order.customer.address || '',
        items: items,
        itemsCount: items.length,
        createdAt: shipment.createdAt.toISOString(),
        shipmentDate: shipment.shipmentDate ? shipment.shipmentDate.toISOString() : shipment.createdAt.toISOString(),
        processedBy: shipment.shippedByUser || { id: '', name: '' },
        status: shipment.status
      };
    });
    
    // Get total count for pagination with the same filter
    const totalShipments = await prisma.shipment.count({
      where: {
        status: 'COMPLETED', // Only count completed shipments
        ...searchFilter,
      },
    });
    
    const totalPages = Math.ceil(totalShipments / pageSize);
    
    return NextResponse.json({
      shipments: formattedShipments,
      totalItems: totalShipments,
      totalPages,
      currentPage: page,
    });
    
  } catch (error) {
    console.error('Error fetching shipment history:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch shipment history' }),
      { status: 500 }
    );
  }
} 