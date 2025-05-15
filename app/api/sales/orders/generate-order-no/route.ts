import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get the current date
    const now = new Date();
    
    // Format date as YYYYMMDD (full year instead of just 2 digits)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePrefix = `SO-${year}${month}${day}`;
    
    // Find existing orders with this date prefix
    const existingOrders = await prisma.order.findMany({
      where: {
        orderNo: {
          startsWith: datePrefix
        }
      },
      orderBy: {
        orderNo: "desc"
      }
    });
    
    // If no orders exist with this prefix, start with 00001
    if (existingOrders.length === 0) {
      return NextResponse.json({ orderNo: `${datePrefix}-00001` });
    }
    
    // Create a Set of all sequence numbers in use
    const usedSequences = new Set<number>();
    
    // Extract and store existing sequence numbers
    existingOrders.forEach(order => {
      try {
        // Extract the sequence part (XXXXX) from the order number
        const sequencePart = order.orderNo.split('-')[2];
        if (sequencePart && /^\d{5}$/.test(sequencePart)) {
          usedSequences.add(parseInt(sequencePart, 10));
        }
      } catch (error) {
        console.warn('Could not parse order number:', order.orderNo);
      }
    });
    
    // Find the first available number between 1 and 99999
    let nextSequence = 1;
    while (usedSequences.has(nextSequence) && nextSequence <= 99999) {
      nextSequence++;
    }
    
    // Format the sequence with leading zeros (5 digits instead of 3)
    const sequenceFormatted = String(nextSequence).padStart(5, '0');
    
    // Return the fully formed order number
    const orderNo = `${datePrefix}-${sequenceFormatted}`;
    
    return NextResponse.json({ orderNo });
  } catch (error) {
    console.error("Error generating order number:", error);
    return NextResponse.json(
      { error: "Failed to generate order number" },
      { status: 500 }
    );
  }
} 