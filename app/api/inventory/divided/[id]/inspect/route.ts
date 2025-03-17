import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const { weight } = await request.json();

    // Validate weight
    if (typeof weight !== "number" || isNaN(weight) || weight <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid weight value" },
        { status: 400 }
      );
    }

    // Check if divided stock exists
    const divided = await prisma.divided.findUnique({
      where: { id },
    });

    if (!divided) {
      return NextResponse.json(
        { success: false, error: "Divided stock not found" },
        { status: 404 }
      );
    }

    // Update divided stock
    const updateData = {
      inspected: true,
      inspectedAt: new Date(),
      weight: weight,
    };

    const updated = await prisma.divided.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error inspecting divided stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to inspect divided stock" },
      { status: 500 }
    );
  }
} 