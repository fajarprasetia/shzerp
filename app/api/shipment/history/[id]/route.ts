import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate user session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get shipment ID from params
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
    }
    
    // Fetch the shipment with related data
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: {
              include: {
                stock: true,
                divided: true
              }
            },
          },
        },
        shipmentItems: {
          include: {
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
    });
    
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }
    
    // Get the order items associated with this shipment to filter correctly
    const orderItemIds = shipment.shipmentItems.map(item => item.orderItemId);
    
    // Create a map of order item IDs to their arrays of scanned barcodes
    const scannedBarcodesMap: Record<string, string[]> = {};
    
    // Group all scanned barcodes by order item ID
    shipment.shipmentItems.forEach(item => {
      if (!scannedBarcodesMap[item.orderItemId]) {
        scannedBarcodesMap[item.orderItemId] = [];
      }
      if (item.scannedBarcode) {
        scannedBarcodesMap[item.orderItemId].push(item.scannedBarcode);
      }
    });
    
    // Format the response data for the client - make sure to match fields expected by frontend
    const formattedShipment = {
      id: shipment.id,
      orderId: shipment.orderId,
      orderNo: shipment.order.orderNo,
      customerName: shipment.order.customer.name,
      customerEmail: shipment.order.customer.email || null,
      customerPhone: shipment.order.customer.phone,
      address: shipment.order.customer.address || '',
      items: shipment.order.orderItems
        .filter(item => orderItemIds.includes(item.id))
        .map(item => {
          const itemData = {
            id: item.id,
            productName: item.type,
            sku: item.id.substring(0, 8),
            barcode: scannedBarcodesMap[item.id]?.[0] || item.id,
            barcodes: scannedBarcodesMap[item.id] || [],
            quantity: Number(item.quantity) || 1,
            price: item.price ? Number(item.price) : 0,
            gsm: item.gsm ? Number(item.gsm) : undefined,
            width: item.width ? Number(item.width) : undefined,
            length: item.length ? Number(item.length) : undefined,
            weight: item.weight ? Number(item.weight) : undefined
          };
          
          // Include jumbo roll details if available
          if (item.stockId && item.stock) {
            itemData.productName = `${item.type} - ${item.stock.jumboRollNo}`;
            if (item.stock.barcodeId && !itemData.barcodes.includes(item.stock.barcodeId)) {
              itemData.barcodes.push(item.stock.barcodeId);
            }
            if (!itemData.barcode || itemData.barcode === item.id) {
              itemData.barcode = item.stock.barcodeId;
            }
            itemData.sku = item.stock.jumboRollNo;
            itemData.gsm = Number(item.stock.gsm);
            itemData.width = Number(item.stock.width);
            itemData.length = Number(item.stock.length);
            itemData.weight = Number(item.stock.weight);
          }
          
          // Include divided roll details if available
          if (item.dividedId && item.divided) {
            itemData.productName = `${item.type} - ${item.divided.rollNo}`;
            if (item.divided.barcodeId && !itemData.barcodes.includes(item.divided.barcodeId)) {
              itemData.barcodes.push(item.divided.barcodeId);
            }
            if (!itemData.barcode || itemData.barcode === item.id) {
              itemData.barcode = item.divided.barcodeId;
            }
            itemData.sku = item.divided.rollNo;
            itemData.width = Number(item.divided.width);
            itemData.length = Number(item.divided.length);
            if (item.divided.weight) {
              itemData.weight = Number(item.divided.weight);
            }
          }
          
          return itemData;
        }),
      createdAt: shipment.shipmentDate.toISOString(),
      processedBy: {
        id: shipment.shippedByUser.id,
        name: shipment.shippedByUser.name
      }
    };
    
    return NextResponse.json({
      shipment: formattedShipment,
    });
    
  } catch (error) {
    console.error('Error fetching shipment details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipment details' },
      { status: 500 }
    );
  }
} 