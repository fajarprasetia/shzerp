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
    
    // Calculate pagination
    const skip = (page - 1) * pageSize;
    
    // Build search filters
    const searchFilter = search
      ? {
          OR: [
            { order: { orderNo: { contains: search, mode: 'insensitive' } } },
            { order: { customer: { name: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {};
    
    // Fetch shipments with related data
    const shipments = await prisma.shipment.findMany({
      where: {
        ...searchFilter,
      },
      include: {
        order: {
          select: {
            orderNo: true,
            customer: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
        shipmentItems: true,
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
    const formattedShipments = shipments.map(shipment => ({
      id: shipment.id,
      orderId: shipment.orderId,
      orderNo: shipment.order.orderNo,
      customerName: shipment.order.customer.name,
      address: shipment.order.customer.address || '',
      items: shipment.shipmentItems,
      createdAt: shipment.createdAt,
      processedBy: shipment.shippedByUser || { id: '', name: '' },
    }));
    
    // Get total count for pagination
    const totalShipments = await prisma.shipment.count({
      where: {
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