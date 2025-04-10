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
      
      // Create an invoice record
      return prisma.invoice.create({
        data: {
          invoiceNo: `INV-${order.orderNo}`,
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.customer.name,
          customerAddress: order.customer.address || "",
          totalAmount: order.totalAmount || order.orderItems.reduce((sum, item) => sum + (item.total || 0), 0),
          paymentStatus: paymentStatus,
          paymentDate: paymentStatus === "PAID" ? new Date() : null,
          paymentImage: order.paymentImage || null,
          paymentMethod: order.paymentMethod || "Bank Transfer",
          reference: order.reference || null,
          
          // Create or update accounts receivable record
          accountsReceivable: {
            connectOrCreate: {
              where: {
                id: `ar-${order.customerId}`
              },
              create: {
                id: `ar-${order.customerId}`,
                customerId: order.customerId,
                totalAmount: order.totalAmount || 0,
                paidAmount: paymentStatus === "PAID" ? (order.totalAmount || 0) : 0,
                status: paymentStatus === "PAID" ? "CLOSED" : "OPEN",
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
              }
            }
          }
        }
      });
    });

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