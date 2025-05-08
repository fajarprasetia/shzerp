import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateDividedRollNo(parentRollNo: string, index: number) {
  // Convert number to base-26 (A-Z) string
  let result = '';
  let num = index;
  
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  }
  
  return `${parentRollNo}${result}`;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { stockId, length, count, note } = data;

    console.log("Received request data:", { stockId, length, count, note });

    // Validate input
    if (!stockId || !length || !count) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get parent stock
    const parentStock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!parentStock) {
      return NextResponse.json(
        { success: false, error: "Parent stock not found" },
        { status: 404 }
      );
    }

    console.log("Found parent stock:", parentStock);

    // Find the current count of divided rolls for this parent jumbo roll
    const existingDividedCount = await prisma.divided.count({
      where: { stockId: parentStock.id },
    });

    // Validate total length
    const totalLength = length * count;
    if (totalLength > parentStock.remainingLength) {
      return NextResponse.json(
        { success: false, error: "Total length exceeds available stock length" },
        { status: 400 }
      );
    }

    // Create divided stock entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const dividedStocks = [];

      // Create divided stocks
      for (let i = 0; i < count; i++) {
        const rollNo = generateDividedRollNo(parentStock.jumboRollNo, existingDividedCount + i);
        console.log("Creating divided stock with roll number:", rollNo);
        
        const divided = await tx.divided.create({
          data: {
            rollNo,
            barcodeId: rollNo,
            stockId: parentStock.id,
            width: parentStock.width,
            length,
            remainingLength: length,
            note,
            inspected: false
          },
          include: {
            stock: {
              select: {
                jumboRollNo: true,
                type: true,
                gsm: true,
                width: true,
                containerNo: true,
              },
            },
            inspectedBy: {
              select: {
                name: true,
              },
            },
          },
        });
        dividedStocks.push(divided);
      }

      // Update parent stock remaining length
      await tx.stock.update({
        where: { id: parentStock.id },
        data: {
          remainingLength: {
            decrement: totalLength,
          },
        },
      });

      return dividedStocks;
    });

    console.log("Successfully created divided stocks:", result);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating bulk divided stock:", error);
    // Ensure we're sending a proper error response
    const errorMessage = error instanceof Error ? error.message : "Error creating bulk divided stock";
    console.error("Error details:", errorMessage);
    
    return new NextResponse(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 