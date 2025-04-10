import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate user session
    const user = await getCurrentUser();
    
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // Get shipment ID from params
    const { id } = params;
    
    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: 'Shipment ID is required' }),
        { status: 400 }
      );
    }
    
    // Fetch the shipment with related data
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        items: true,
        processedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!shipment) {
      return new NextResponse(
        JSON.stringify({ error: 'Shipment not found' }),
        { status: 404 }
      );
    }
    
    // Format the response data for the client
    const formattedShipment = {
      id: shipment.id,
      orderId: shipment.orderId,
      orderNo: shipment.order.orderNo,
      customerName: shipment.order.customer.name,
      customerEmail: shipment.order.customer.email,
      customerPhone: shipment.order.customer.phone,
      address: shipment.order.customer.address,
      items: shipment.items.map(item => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        price: item.price,
      })),
      createdAt: shipment.createdAt,
      processedBy: shipment.processedBy,
    };
    
    return NextResponse.json({
      shipment: formattedShipment,
    });
    
  } catch (error) {
    console.error('Error fetching shipment details:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch shipment details' }),
      { status: 500 }
    );
  }
} 