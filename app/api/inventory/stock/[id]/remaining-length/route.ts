import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { remainingLength } = await req.json();
    if (typeof remainingLength !== "number" || remainingLength < 0) {
      return NextResponse.json({ error: "Invalid remainingLength" }, { status: 400 });
    }
    const stock = await prisma.stock.update({
      where: { id },
      data: { remainingLength },
    });
    return NextResponse.json(stock);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update remaining length" }, { status: 500 });
  }
} 