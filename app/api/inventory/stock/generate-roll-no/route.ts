import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get current date
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear().toString().slice(-2);
    const prefix = `SHZ${year}${month}`;

    // Find the latest roll number for the current month and year
    const latestStock = await prisma.stock.findFirst({
      where: {
        jumboRollNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        jumboRollNo: "desc",
      },
    });

    let sequence = "0001";
    if (latestStock?.jumboRollNo) {
      // Extract the sequence number and increment
      const currentSequence = parseInt(latestStock.jumboRollNo.slice(-4));
      sequence = (currentSequence + 1).toString().padStart(4, "0");
    }

    const rollNo = `${prefix}${sequence}`;

    return NextResponse.json({ rollNo });
  } catch (error) {
    console.error("Error generating roll number:", error);
    return NextResponse.json(
      { error: "Failed to generate roll number" },
      { status: 500 }
    );
  }
} 