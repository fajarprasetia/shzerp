import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stockId, meterPerRoll, rollCount, note } = body;

    // Validate stock exists and has enough remaining length
    const stock = await prisma.stock.findUnique({
      where: { id: stockId }
    });

    if (!stock) {
      return NextResponse.json(
        { error: "Stock not found" },
        { status: 404 }
      );
    }

    const totalLength = meterPerRoll * rollCount;
    if (totalLength > stock.remainingLength) {
      return NextResponse.json(
        { error: "Total length exceeds available stock length" },
        { status: 400 }
      );
    }

    // Start a transaction to create divided rolls and update stock
    const result = await prisma.$transaction(async (tx) => {
      const dividedRolls = [];
      
      for (let i = 0; i < rollCount; i++) {
        const sequence = String.fromCharCode(65 + i); // A, B, C, ...
        const rollNo = `${stock.jumboRollNo}${sequence}`;
        
        const dividedRoll = await tx.divided.create({
          data: {
            rollNo,
            barcodeId: rollNo, // Use roll number as barcode ID
            width: stock.width,
            length: meterPerRoll,
            remainingLength: meterPerRoll, // Add the required remainingLength field
            weight: (stock.weight / stock.length) * meterPerRoll, // Calculate proportional weight
            note: note || null,
            stockId: stock.id,
            inspected: false,
          },
        });
        
        dividedRolls.push(dividedRoll);
      }

      // Update remaining length in stock
      await tx.stock.update({
        where: { id: stock.id },
        data: {
          remainingLength: {
            decrement: totalLength
          }
        }
      });

      return dividedRolls;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating divided stock:', error);
    return NextResponse.json(
      { error: 'Failed to create divided stock' },
      { status: 500 }
    );
  }
} 