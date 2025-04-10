import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/debug/test - Test database connection without authentication
export async function GET(request: Request) {
  try {
    console.log('Executing GET /api/debug/test');
    
    try {
      // Test the connection to the database with a simple query
      const userCount = await prisma.user.count();
      console.log(`Database connection successful. Found ${userCount} users.`);
      
      // Test the Invoice model
      const invoiceCount = await prisma.invoice.count();
      console.log(`Invoice model test: Found ${invoiceCount} invoices.`);
      
      // Return diagnostic information with headers to prevent auth middleware redirect
      return new NextResponse(
        JSON.stringify({
          status: 'success',
          database: {
            connected: true,
            users: userCount,
            invoices: invoiceCount
          },
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            // Set a special header that our middleware could check
            'X-Debug-Mode': 'true'
          }
        }
      );
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new NextResponse(
        JSON.stringify({
          status: 'error',
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : String(dbError),
          timestamp: new Date().toISOString()
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
    console.error('API error:', error);
    return new NextResponse(
      JSON.stringify({
        status: 'error',
        error: 'API error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
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