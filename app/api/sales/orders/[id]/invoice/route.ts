import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// Function to generate a new invoice number in the format INV-YYYYMMDD-XXXXX
async function generateInvoiceNumber(date: Date): Promise<string> {
  // Format date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePrefix = `INV-${year}${month}${day}`;
  
  // Find existing invoices with this date prefix
  const existingInvoices = await prisma.invoice.findMany({
    where: {
      invoiceNo: {
        startsWith: datePrefix
      }
    },
    orderBy: {
      invoiceNo: 'desc'
    }
  });
  
  // If no invoices exist with this prefix, start with 00001
  if (existingInvoices.length === 0) {
    return `${datePrefix}-00001`;
  }
  
  // Create a Set of all sequence numbers in use
  const usedSequences = new Set<number>();
  
  // Extract and store existing sequence numbers
  existingInvoices.forEach(invoice => {
    try {
      // Extract the sequence part (XXXXX) from the invoice number
      const sequencePart = invoice.invoiceNo.split('-')[2];
      if (sequencePart && /^\d{5}$/.test(sequencePart)) {
        usedSequences.add(parseInt(sequencePart, 10));
      }
    } catch (error) {
      console.warn('Could not parse invoice number:', invoice.invoiceNo);
    }
  });
  
  // Find the first available number between 1 and 99999
  let nextSequence = 1;
  while (usedSequences.has(nextSequence) && nextSequence <= 99999) {
    nextSequence++;
  }
  
  // Format the sequence with leading zeros
  const sequenceFormatted = String(nextSequence).padStart(5, '0');
  
  return `${datePrefix}-${sequenceFormatted}`;
}

// POST /api/sales/orders/[id]/invoice - Generate or update invoice from order
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for X-Debug-Mode header
    const isDebugMode = request.headers.get('X-Debug-Mode') === 'true';
    
    // Only check authentication if not in debug mode
    if (!isDebugMode) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse request body to get invoice date if provided
    let requestBody: { invoiceDate?: string } = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      console.warn('Failed to parse request body:', e);
    }
    
    // Extract invoiceDate from request body
    const invoiceDate = requestBody?.invoiceDate 
      ? new Date(requestBody.invoiceDate) 
      : new Date();
      
    console.log('Using invoice date:', invoiceDate);

    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
        const orderId = id;
    console.log('Generating invoice for order:', orderId);

    // Check if order exists and get its details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        orderItems: {
          include: {
            stock: true,
            divided: true
          }
        },
        invoices: true
      }
    });

    if (!order) {
      console.error('Order not found:', orderId);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('Found order:', {
      orderNo: order.orderNo,
      customerId: order.customerId,
      itemCount: order.orderItems.length,
      existingInvoices: order.invoices.length,
      totalAmount: order.totalAmount,
      discount: order.discount,
      discountType: order.discountType
    });

    // Use the totalAmount directly - it already has the discount applied
    const finalTotal = order.totalAmount;
    
    console.log('Using final total for invoice:', finalTotal);

    // For existing orders with payment proof, use their status
    const paymentStatus = order.paymentImage ? "PAID" : "PENDING";
    
    // Check if invoice already exists and update it instead of creating a new one
    if (order.invoices.length > 0) {
      console.log('Invoice already exists for order, updating:', orderId);
      const existingInvoice = order.invoices[0];
      
      // Update the AR record associated with this invoice if it exists
      if (existingInvoice.accountsReceivableId) {
        await prisma.accountsReceivable.update({
          where: {
            id: existingInvoice.accountsReceivableId
          },
          data: {
            totalAmount: finalTotal,
            paidAmount: paymentStatus === "PAID" ? finalTotal : 0,
            status: paymentStatus === "PAID" ? "CLOSED" : "OPEN",
            updatedAt: invoiceDate,
          }
        });
      }
      
      // Update the invoice with new values
      const updatedInvoice = await prisma.invoice.update({
        where: {
          id: existingInvoice.id
        },
        data: {
          totalAmount: finalTotal,
          paymentStatus: paymentStatus,
          paymentDate: paymentStatus === "PAID" ? invoiceDate : null,
          paymentImage: order.paymentImage || null,
          paymentMethod: order.paymentMethod || "Bank Transfer",
          reference: order.reference || null,
          updatedAt: invoiceDate,
        }
      });
      
      console.log('Successfully updated invoice:', updatedInvoice.id);
      
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: 'Successfully updated invoice for order',
          invoice: updatedInvoice,
          action: 'update'
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Mode': 'true'
          }
        }
      );
    }
    
    // Generate a new invoice number using our custom function
    const invoiceNo = await generateInvoiceNumber(invoiceDate);
    
    // If no existing invoice, create a new one
    console.log('Creating new invoice with data:', {
      invoiceNo,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customer.name,
      totalAmount: finalTotal,
      paymentStatus,
      invoiceDate
    });

    // First, create or update the accounts receivable record
    const arId = `ar-${order.customerId}`;
    const accountsReceivable = await prisma.accountsReceivable.upsert({
      where: {
        id: arId
      },
      create: {
        id: arId,
        customerId: order.customerId,
        totalAmount: finalTotal,
        paidAmount: paymentStatus === "PAID" ? finalTotal : 0,
        status: paymentStatus === "PAID" ? "CLOSED" : "OPEN",
        dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from invoice date
        createdAt: invoiceDate,
        updatedAt: invoiceDate
      },
      update: {
        totalAmount: { increment: finalTotal },
        paidAmount: paymentStatus === "PAID" ? { increment: finalTotal } : undefined,
        status: paymentStatus === "PAID" ? "CLOSED" : "OPEN",
        updatedAt: invoiceDate
      }
    });

    // Then create the invoice with a reference to the accounts receivable
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerAddress: order.customer.address || "",
        totalAmount: finalTotal,
        paymentStatus: paymentStatus,
        paymentDate: paymentStatus === "PAID" ? invoiceDate : null,
        paymentImage: order.paymentImage || null,
        paymentMethod: order.paymentMethod || "Bank Transfer",
        reference: order.reference || null,
        accountsReceivableId: accountsReceivable.id, // Connect to the AR record
        createdAt: invoiceDate,
        updatedAt: invoiceDate
      }
    });

    console.log('Successfully created invoice:', invoice.id);

    // Return with debug headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Successfully generated invoice from order',
        invoice,
        action: 'create'
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Mode': 'true'
        }
      }
    );
  } catch (error) {
    console.error('Error generating invoice:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to generate invoice from order', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Mode': 'true'
        }
      }
    );
  }
} 