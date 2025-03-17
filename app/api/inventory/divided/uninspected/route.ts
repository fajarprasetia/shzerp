import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const divided = await prisma.divided.findMany({
      where: {
        inspected: false,
      },
      include: {
        stock: {
          select: {
            jumboRollNo: true,
            type: true,
            gsm: true,
          },
        },
        inspectedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(divided);
  } catch (error) {
    console.error("Error fetching uninspected divided stock:", error);
    return NextResponse.json(
      { error: "Error fetching uninspected divided stock" },
      { status: 500 }
    );
  }
} 