import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// POST /api/sales/orders/[id]/invoice - Generate invoice from order
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

    const orderId = params.id;
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
      existingInvoices: order.invoices.length
    });

    // Check if invoice already exists
    if (order.invoices.length > 0) {
      console.log('Invoice already exists for order:', orderId);
      return NextResponse.json(
        { error: 'Invoice already exists for this order' },
        { status: 400 }
      );
    }

    // Calculate total amount from order items if not set on order
    const calculatedTotalAmount = order.orderItems.reduce((sum, item) => {
      const itemTotal = (item.price * item.quantity) + (item.tax || 0);
      console.log('Item total calculation:', {
        itemId: item.id,
        price: item.price,
        quantity: item.quantity,
        tax: item.tax,
        total: itemTotal
      });
      return sum + itemTotal;
    }, 0);

    // For existing orders with payment proof, use their status
    const paymentStatus = order.paymentImage ? "PAID" : "PENDING";
    const totalAmount = order.totalAmount || calculatedTotalAmount;
    
    console.log('Creating invoice with data:', {
      invoiceNo: `INV-${order.orderNo}`,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customer.name,
      totalAmount,
      paymentStatus
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
        totalAmount: totalAmount,
        paidAmount: paymentStatus === "PAID" ? totalAmount : 0,
        status: paymentStatus === "PAID" ? "CLOSED" : "OPEN",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      update: {
        totalAmount: { increment: totalAmount },
        paidAmount: paymentStatus === "PAID" ? { increment: totalAmount } : undefined,
        status: paymentStatus === "PAID" ? "CLOSED" : "OPEN",
      }
    });

    // Then create the invoice with a reference to the accounts receivable
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-${order.orderNo}`,
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerAddress: order.customer.address || "",
        totalAmount: totalAmount,
        paymentStatus: paymentStatus,
        paymentDate: paymentStatus === "PAID" ? new Date() : null,
        paymentImage: order.paymentImage || null,
        paymentMethod: order.paymentMethod || "Bank Transfer",
        reference: order.reference || null,
        accountsReceivableId: accountsReceivable.id // Connect to the AR record
      }
    });

    console.log('Successfully created invoice:', invoice.id);

    // Return with debug headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Successfully generated invoice from order',
        invoice
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