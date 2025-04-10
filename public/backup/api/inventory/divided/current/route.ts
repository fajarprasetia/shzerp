import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Generate roll number and barcode ID
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the last roll number for today
    const lastRoll = await prisma.divided.findFirst({
      where: {
        rollNo: {
          startsWith: `DIV-${dateStr}`,
        },
      },
      orderBy: {
        rollNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastRoll) {
      const lastSequence = parseInt(lastRoll.rollNo.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    const rollNo = `DIV-${dateStr}-${sequence.toString().padStart(3, '0')}`;
    const barcodeId = rollNo;

    const divided = await prisma.divided.create({
      data: {
        rollNo,
        barcodeId,
        gsm: body.gsm,
        width: body.width,
        length: body.length,
        weight: body.weight || null,
        note: body.note || null,
        stockId: "current",
        inspected: false,
      },
    });

    return NextResponse.json(divided);
  } catch (error) {
    console.error('Error creating divided stock:', error);
    return NextResponse.json(
      { error: 'Failed to create divided stock' },
      { status: 500 }
    );
  }
} 