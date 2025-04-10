import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { isSystemAdmin: false, isAdmin: false, permissions: [] },
        { status: 200 }
      );
    }

    // Get the user with role and permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { isSystemAdmin: false, isAdmin: false, permissions: [] },
        { status: 200 }
      );
    }

    // Return permissions data
    return NextResponse.json({
      isSystemAdmin: user.isSystemAdmin || false,
      isAdmin: user.role?.isAdmin || false,
      permissions: user.role?.permissions || [],
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions", isSystemAdmin: false, isAdmin: false, permissions: [] },
      { status: 200 }
    );
  }
} 