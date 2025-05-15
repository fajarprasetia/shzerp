import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// POST /api/sales/invoices/sync - Sync invoices from orders
export async function POST(request: Request) {
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

    // Get all orders that don't have invoices yet
    const orders = await prisma.order.findMany({
      where: {
        invoices: {
          none: {}
        }
      },
      include: {
        customer: true,
        orderItems: true
      }
    });

    console.log(`Found ${orders.length} orders without invoices`);

    // Create invoices for each order
    const invoicePromises = orders.map(async (order) => {
      // For existing orders with payment proof, use their status
      const paymentStatus = order.paymentImage ? "PAID" : "PENDING";
      
      // Generate invoice number based on order number (SO-YYYYMMDDXXX -> INV-YYYYMMDDXXX)
      const orderNo = order.orderNo;
      const match = orderNo.match(/^SO-(\d{4})(\d{2})(\d{2})(\d{3})$/);
      if (!match) throw new Error('Invalid order number format');
      const [_, year, month, day, sequence] = match;
      const invoiceNo = `INV-${year}${month}${day}${sequence}`;
      
      // Check for existing invoice with this number
      const existing = await prisma.invoice.findUnique({ where: { invoiceNo } });
      if (existing) {
        // Skip or handle as needed (skip for now)
        return null;
      }
      
      // Create the invoice
      return prisma.invoice.create({
        data: {
          invoiceNo,
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.customer.name,
          customerAddress: order.customer.address || "",
          totalAmount: order.totalAmount || 0,
          paymentStatus: paymentStatus,
          paymentDate: paymentStatus === "PAID" ? new Date() : null,
          paymentImage: order.paymentImage || null,
          paymentMethod: order.paymentMethod || "Bank Transfer",
          reference: order.reference || null
        }
      });
    });

    // First create the accounts receivable records
    await Promise.all(orders.map(async (order) => {
      const paymentStatus = order.paymentImage ? "PAID" : "PENDING";
      const totalAmount = order.totalAmount || 0;
      
      // Create or update accounts receivable record separately
      return prisma.accountsReceivable.upsert({
        where: {
          id: `ar-${order.customerId}`
        },
        create: {
          id: `ar-${order.customerId}`,
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
          updatedAt: new Date()
        }
      });
    }));

    const createdInvoices = await Promise.all(invoicePromises);

    // Return with debug headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${createdInvoices.length} invoices from orders`,
        count: createdInvoices.length
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
    console.error('Error syncing invoices:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to sync invoices from orders', 
        details: error instanceof Error ? error.message : String(error) 
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