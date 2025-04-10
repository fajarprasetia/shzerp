import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// GET /api/finance/accounts-receivable - Get accounts receivable data
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    // Build the query
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (customerId) {
      query.customerId = customerId;
    }

    // Fetch accounts receivable data
    const arData = await prisma.accountsReceivable.findMany({
      where: query,
      include: {
        customer: true,
        invoices: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(arData);
  } catch (error) {
    console.error('Error fetching accounts receivable data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts receivable data' },
      { status: 500 }
    );
  }
} 