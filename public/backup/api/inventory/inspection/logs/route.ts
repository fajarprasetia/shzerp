import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.inspectionLog.findMany({
      include: {
        user: true,
        stock: true,
        divided: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching inspection logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection logs' },
      { status: 500 }
    );
  }
} 