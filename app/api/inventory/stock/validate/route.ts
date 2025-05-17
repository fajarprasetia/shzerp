import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barcodeId = searchParams.get('barcode') || searchParams.get('barcodeId');

    if (!barcodeId) {
      return NextResponse.json(
        { error: 'Barcode ID is required' },
        { status: 400 }
      );
    }

    // Check if the barcode already exists in the database
    const existingStock = await prisma.stock.findFirst({
      where: {
        barcodeId: barcodeId
      },
      include: {
        inspectedBy: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingStock) {
      return NextResponse.json(
        { error: 'Stock not found with this barcode' },
        { status: 404 }
      );
    }

    // Return full stock details
    return NextResponse.json(existingStock);
  } catch (error) {
    console.error('Error validating barcode:', error);
    return NextResponse.json(
      { error: 'Failed to validate barcode' },
      { status: 500 }
    );
  }
} 