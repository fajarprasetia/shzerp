import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// GET /api/sales/invoices - Get all invoices
export async function GET(request: Request) {
  try {
    // DEBUGGING: Bypass authentication for testing
    // const user = await getCurrentUser();
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    console.log('Executing GET /api/sales/invoices');
    
    try {
      // Simple count query to verify connection
      const count = await prisma.invoice.count();
      console.log(`Database connection successful. Found ${count} invoices.`);
      
      // Fetch invoices with related data - Using include instead of select to avoid schema errors
      const invoices = await prisma.invoice.findMany({
        take: 100, // Limit to first 100 records
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  stock: true,
                  divided: {
                    include: {
                      stock: true // Include the parent stock for divided items
                    }
                  }
                }
              },
              customer: true
            }
          }
        }
      });
      
      console.log(`Successfully fetched ${invoices.length} invoices`);
      
      // Log detailed info about the first invoice's order items for debugging
      if (invoices.length > 0 && invoices[0].order) {
        const sampleInvoice = invoices[0];
        console.log(`Sample invoice ${sampleInvoice.invoiceNo} has ${sampleInvoice.order.orderItems.length} items`);
        
        sampleInvoice.order.orderItems.forEach((item, index) => {
          console.log(`Item ${index + 1}:`, {
            id: item.id,
            price: item.price,
            quantity: item.quantity,
            tax: item.tax,
            hasStock: !!item.stock,
            hasDivided: !!item.divided,
            dividedStockGSM: item.divided?.stock?.gsm,
            stockGSM: item.stock?.gsm
          });
        });
      }
      
      // Transform the data to include order items directly on the invoice
      const transformedInvoices = invoices.map(invoice => {
        // Prepare order items with proper type information
        const orderItems = invoice.order?.orderItems.map(item => {
          // Always use type, product, gsm from OrderItem table
          const { id, price, quantity, tax, width, length, weight, product, type, gsm } = item;
          return {
            id, price, quantity, tax,
            width,
            length,
            weight,
            product,
            type,
            gsm
          };
        }) || [];
        return {
          ...invoice,
          orderItems: orderItems,
          order: undefined // Remove the order object since we've extracted orderItems
        };
      });
      
      console.log(`Transformed ${transformedInvoices.length} invoices with order items`);
      
      // Return transformed invoices with debug headers
      return new NextResponse(
        JSON.stringify(transformedInvoices),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Mode': 'true'
          }
        }
      );
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new NextResponse(
        JSON.stringify({
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined
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
    
  } catch (error) {
    console.error('Error in GET /api/sales/invoices:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
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