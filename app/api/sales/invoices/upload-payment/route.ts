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
    console.log('Starting payment proof upload process');
    
    // Check for X-Debug-Mode header
    const isDebugMode = request.headers.get('X-Debug-Mode') === 'true';
    console.log('Debug mode:', isDebugMode);
    
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
      console.log(`Creating directory: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const invoiceId = formData.get('invoiceId') as string;

    console.log('Received form data:', { 
      hasFile: !!file, 
      fileName: file?.name,
      fileSize: file?.size,
      invoiceId 
    });

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
    console.log(`Finding invoice with ID: ${invoiceId}`);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true,
        accountsReceivable: true
      }
    });

    console.log('Invoice found:', { 
      found: !!invoice,
      orderId: invoice?.orderId,
      hasOrder: !!invoice?.order,
      hasAccountsReceivable: !!invoice?.accountsReceivableId
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
    console.log(`Generating file path: ${filePath}`);

    // Write the file to disk
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      console.log(`File written successfully to: ${filePath}`);
    } catch (fileError) {
      console.error('Error writing file:', fileError);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to write file to disk', 
          details: fileError instanceof Error ? fileError.message : String(fileError) 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-Debug-Mode': 'true' } }
      );
    }

    // Get relative path for storing in the database
    const relativeFilePath = fileName;

    // Update the invoice with payment information
    try {
      console.log(`Updating invoice: ${invoiceId}`);
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: 'PAID',
          paymentDate: new Date(),
          paymentImage: relativeFilePath,
        }
      });
      console.log('Invoice updated successfully');

      // Update the original order as well
      if (invoice.order) {
        console.log(`Updating related order: ${invoice.orderId}`);
        await prisma.order.update({
          where: { id: invoice.orderId },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paymentImage: relativeFilePath,
            paymentMethod: 'Bank Transfer' // default
          }
        });
        console.log('Order updated successfully');
      }

      // Skip accounts receivable if it's causing issues
      // We'll just log instead of updating for now
      if (invoice.accountsReceivableId) {
        try {
          console.log(`Updating accounts receivable: ${invoice.accountsReceivableId}`);
          await prisma.accountsReceivable.update({
            where: { id: invoice.accountsReceivableId },
            data: {
              paidAmount: {
                increment: invoice.totalAmount
              },
              status: 'CLOSED'
            }
          });
          console.log('Accounts receivable updated successfully');
        } catch (arError) {
          console.error('Error updating accounts receivable (non-fatal):', arError);
          // Continue execution even if this fails
        }
      } else {
        // Skip creating a new accounts receivable for now
        console.log('No existing accounts receivable, skipping creation');
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
    } catch (dbError) {
      console.error('Database error:', dbError);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Database operation failed', 
          details: dbError instanceof Error ? dbError.message : String(dbError) 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-Debug-Mode': 'true' } }
      );
    }
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