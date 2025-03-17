import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type");
    const itemType = searchParams.get("itemType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where = {
      ...(type && { type }),
      ...(itemType && { itemType }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.inspectionLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inspectionLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inspection logs:", error);
    return NextResponse.json(
      { error: "Error fetching inspection logs" },
      { status: 500 }
    );
  }
} 