import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    const count = await prisma.stock.count({
      where: {
        jumboRollNo: {
          startsWith: `SHZ${year}${month}`,
        },
      },
    });
    
    const rollNo = `SHZ${year}${month}${String(count + 1).padStart(4, '0')}`;
    
    return NextResponse.json({
      rollNo,
      success: true
    });
  } catch (error) {
    console.error("Error generating roll number:", error);
    return NextResponse.json(
      { error: "Failed to generate roll number" },
      { status: 500 }
    );
  }
} 