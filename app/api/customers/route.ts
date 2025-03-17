import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return new NextResponse("Error fetching customers", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const customer = await prisma.customer.create({
      data,
    });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return new NextResponse("Error creating customer", { status: 500 });
  }
} 