import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

    const notifications = await prisma.notification.findMany({
      where: {
        userId: defaultUser.id,
        type: {
          in: ['finance_transaction', 'finance_budget', 'finance_account'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 notifications
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, message, type } = data;

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

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId: defaultUser.id,
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
} 