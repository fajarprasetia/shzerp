import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { notificationIds } = await request.json();

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "Invalid notification IDs" },
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

    // Update notifications
    await prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds,
        },
        userId: defaultUser.id,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
} 