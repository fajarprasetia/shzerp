import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get the current date
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    // Get the latest order number for this month
    const latestOrder = await prisma.order.findFirst({
      where: {
        orderNo: {
          startsWith: `SO${year}${month}`
        }
      },
      orderBy: {
        orderNo: "desc"
      }
    });

    // Generate the next order number
    let sequence = "001";
    if (latestOrder) {
      const lastSequence = parseInt(latestOrder.orderNo.slice(-3));
      sequence = (lastSequence + 1).toString().padStart(3, "0");
    }

    const orderNo = `SO${year}${month}${sequence}`;

    return NextResponse.json({ orderNo });
  } catch (error) {
    console.error("Error generating order number:", error);
    return NextResponse.json(
      { error: "Failed to generate order number" },
      { status: 500 }
    );
  }
} 