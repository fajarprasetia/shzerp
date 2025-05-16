import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateTravelDocumentPDF } from '@/app/(main)/shipment/travel-document-generator';
import i18nInstance from '@/app/i18n';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate user session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get shipment ID from params
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "Shipment ID is required" }, { status: 400 });
    }
    
    // Get language from URL search params or use the current i18n language
    const url = new URL(req.url);
    const lang = url.searchParams.get('lang') || i18nInstance.language || 'en';
    
    // Set the language for this request
    if (i18nInstance.language !== lang) {
      await i18nInstance.changeLanguage(lang);
    }
    
    console.log(`Generating travel document for shipment: ${id} in language: ${lang}`);
    
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
      console.error(`Shipment not found with ID: ${id}`);
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }
    
    // Create a map of order item IDs to their scanned barcodes (storing all barcodes for each item ID)
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
    
    console.log('Scanned barcodes map:', scannedBarcodesMap);
    
    // Collect all items to include in the document - both explicitly scanned and associated inventory items
    const shipmentItems = [];
    
    // Process all order items from this order
    for (const orderItem of shipment.order.orderItems) {
      // Create a base item for the document
      const baseItem = {
        id: orderItem.id,
        // Store the clean product name without any barcode or roll number
        productName: orderItem.type || 'Unknown Product',
        // Store identification numbers separately
        identifierNumber: '',
        sku: orderItem.id.substring(0, 8),
        quantity: Number(orderItem.quantity) || 1,
        type: orderItem.type,
        gsm: orderItem.gsm ? Number(orderItem.gsm) : undefined,
        width: orderItem.width ? Number(orderItem.width) : undefined,
        length: orderItem.length ? Number(orderItem.length) : undefined,
        weight: orderItem.weight ? Number(orderItem.weight) : undefined,
        barcodes: scannedBarcodesMap[orderItem.id] || [],
        barcode: ''
      };
      
      // Add jumbo roll details if present
      if (orderItem.stockId && orderItem.stock) {
        // Store the roll number separately
        baseItem.identifierNumber = orderItem.stock.jumboRollNo;
        // Add jumbo roll barcode if it exists and isn't already in the list
        if (orderItem.stock.barcodeId && !baseItem.barcodes.includes(orderItem.stock.barcodeId)) {
          baseItem.barcodes.push(orderItem.stock.barcodeId);
        }
        baseItem.sku = orderItem.stock.jumboRollNo || baseItem.sku;
        baseItem.gsm = Number(orderItem.stock.gsm);
      }
      
      // Add divided roll details if present
      if (orderItem.dividedId && orderItem.divided) {
        // Store the roll number separately
        baseItem.identifierNumber = orderItem.divided.rollNo;
        // Add divided roll barcode if it exists and isn't already in the list
        if (orderItem.divided.barcodeId && !baseItem.barcodes.includes(orderItem.divided.barcodeId)) {
          baseItem.barcodes.push(orderItem.divided.barcodeId);
        }
        baseItem.sku = orderItem.divided.rollNo || baseItem.sku;
      }
      
      // Ensure at least one barcode is available
      if (baseItem.barcodes.length === 0) {
        baseItem.barcode = orderItem.id;
      } else {
        baseItem.barcode = baseItem.barcodes[0];
      }
      
      shipmentItems.push(baseItem);
    }

    // Format the shipment data for the PDF generator
    const formattedShipment = {
      id: shipment.id,
      orderId: shipment.orderId,
      orderNo: shipment.order.orderNo,
      customerName: shipment.order.customer.name,
      customerEmail: shipment.order.customer.email || '',
      customerPhone: shipment.order.customer.phone,
      address: shipment.order.customer.address || '',
      items: shipmentItems,
      createdAt: shipment.shipmentDate.toISOString(),
      processedBy: {
        id: shipment.shippedByUser.id,
        name: shipment.shippedByUser.name ?? '',
      }
    };
    
    // Check if there are items to include in the document
    if (formattedShipment.items.length === 0) {
      console.error('No items found for the travel document');
      return NextResponse.json({ 
        error: "No items found for this shipment" 
      }, { status: 400 });
    }
    
    console.log(`Generating PDF with ${formattedShipment.items.length} items`);
    
    try {
      // Generate the PDF and pass i18n's translation function
      const pdfBuffer = await generateTravelDocumentPDF(formattedShipment, i18nInstance.t.bind(i18nInstance));
      
      // Return the PDF as a download
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="travel-document-${shipment.order.orderNo}.pdf"`
        }
      });
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      return NextResponse.json({ 
        error: "Failed to generate PDF", 
        details: pdfError instanceof Error ? pdfError.message : 'Unknown PDF generation error' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error generating travel document:', error);
    return NextResponse.json({ 
      error: "Failed to generate travel document",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 