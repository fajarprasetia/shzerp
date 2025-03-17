import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Get all roles
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin or system admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user?.isSystemAdmin && !(user?.role?.isAdmin)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Create a new role
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin or system admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user?.isSystemAdmin && !(user?.role?.isAdmin)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, isAdmin, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name,
        description,
        isAdmin: isAdmin || false,
      },
    });

    // Create permissions if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      await prisma.permission.createMany({
        data: permissions.map((perm: { resource: string; action: string }) => ({
          roleId: role.id,
          resource: perm.resource,
          action: perm.action,
        })),
      });
    }

    // Get the role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: role.id },
      include: { permissions: true },
    });

    return NextResponse.json(roleWithPermissions);
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 