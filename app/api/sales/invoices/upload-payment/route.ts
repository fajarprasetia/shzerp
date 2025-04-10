import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';

// POST /api/sales/invoices/upload-payment - Upload payment proof for an invoice
export async function POST(request: Request) {
  try {
    // Check for X-Debug-Mode header
    const isDebugMode = request.headers.get('X-Debug-Mode') === 'true';
    
    // Only check authentication if not in debug mode
    if (!isDebugMode) {
      const user = await getCurrentUser();
      if (!user) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const invoiceId = formData.get('invoiceId') as string;

    if (!file || !invoiceId) {
      return new NextResponse(
        JSON.stringify({ error: 'File and invoice ID are required' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Mode': 'true'
          }
        }
      );
    }

    // Find the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true,
        accountsReceivable: true
      }
    });

    if (!invoice) {
      return new NextResponse(
        JSON.stringify({ error: 'Invoice not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Mode': 'true'
          }
        }
      );
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write the file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Get relative path for storing in the database
    const relativeFilePath = fileName;

    // Update the invoice with payment information
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentStatus: 'PAID',
        paymentDate: new Date(),
        paymentImage: relativeFilePath,
      }
    });

    // Update the original order as well
    if (invoice.order) {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentImage: relativeFilePath,
          paymentMethod: 'Bank Transfer' // default
        }
      });
    }

    // Update accounts receivable
    if (invoice.accountsReceivableId) {
      await prisma.accountsReceivable.update({
        where: { id: invoice.accountsReceivableId },
        data: {
          paidAmount: {
            increment: invoice.totalAmount
          },
          status: 'CLOSED'
        }
      });
    } else {
      // Create a new accounts receivable entry if it doesn't exist
      await prisma.accountsReceivable.create({
        data: {
          id: `ar-${invoice.customerId}`,
          customerId: invoice.customerId,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.totalAmount,
          status: 'CLOSED',
          dueDate: new Date(),
          invoices: {
            connect: {
              id: invoice.id
            }
          }
        }
      });
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Payment proof uploaded successfully',
        invoice: updatedInvoice
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
    console.error('Error uploading payment proof:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to upload payment proof', 
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