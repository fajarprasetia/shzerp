import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface Params {
  params: {
    id: string;
  };
}

// Get a specific role
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin or system admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user?.isSystemAdmin && !(user?.role?.isAdmin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { id } = params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!role) {
      return new NextResponse("Role not found", { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Update a role
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin or system admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user?.isSystemAdmin && !(user?.role?.isAdmin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, isAdmin, permissions } = body;

    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        isAdmin: isAdmin || false,
      },
    });

    // Update permissions if provided
    if (permissions) {
      // Delete existing permissions
      await prisma.permission.deleteMany({
        where: { roleId: id },
      });

      // Create new permissions
      if (Array.isArray(permissions) && permissions.length > 0) {
        await prisma.permission.createMany({
          data: permissions.map((perm: { resource: string; action: string }) => ({
            roleId: role.id,
            resource: perm.resource,
            action: perm.action,
          })),
        });
      }
    }

    // Get the updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Delete a role
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin or system admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user?.isSystemAdmin && !(user?.role?.isAdmin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { id } = params;

    // Check if any users are using this role
    const usersWithRole = await prisma.user.count({
      where: { roleId: id },
    });

    if (usersWithRole > 0) {
      return new NextResponse(
        "Cannot delete role that is assigned to users",
        { status: 400 }
      );
    }

    // Delete role (permissions will be deleted due to cascade)
    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 