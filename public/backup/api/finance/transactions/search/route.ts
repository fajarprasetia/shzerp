import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const query = searchParams.get("query");

    if (!tag && !query) {
      return NextResponse.json(
        { error: "Missing search parameters" },
        { status: 400 }
      );
    }

    // Get the default user for now (we'll add auth later)
    const defaultUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' },
    });

    if (!defaultUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const where = {
      userId: defaultUser.id,
      OR: [
        ...(tag ? [{ tags: { has: tag } }] : []),
        ...(query ? [
          { description: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
        ] : []),
      ],
    };

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({
      transactions,
    });
  } catch (error) {
    console.error("Error searching transactions:", error);
    return NextResponse.json(
      { error: "Failed to search transactions" },
      { status: 500 }
    );
  }
} 