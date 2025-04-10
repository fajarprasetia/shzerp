import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcrypt";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin or system admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!currentUser?.isSystemAdmin && !(currentUser?.role?.isAdmin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { id } = params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        isSystemUser: true,
        isSystemAdmin: true,
        role: {
          select: {
            id: true,
            name: true,
            isAdmin: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin or system admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!currentUser?.isSystemAdmin && !(currentUser?.role?.isAdmin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, email, password, roleId, isSystemAdmin } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent changing system admin status for system users
    if (existingUser.isSystemUser && typeof isSystemAdmin !== 'undefined') {
      return NextResponse.json(
        { error: "Cannot change system admin status for system users" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.hashedPassword = await bcrypt.hash(password, 10);
    if (typeof isSystemAdmin !== 'undefined' && !existingUser.isSystemUser) {
      updateData.isSystemAdmin = isSystemAdmin;
    }
    if (roleId) updateData.roleId = roleId;

    const user = await prisma.user.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            isAdmin: true,
          },
        },
      },
    });

    // Remove sensitive data before returning
    const { hashedPassword, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is admin or system admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!currentUser?.isSystemAdmin && !(currentUser?.role?.isAdmin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { id } = params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting system users
    if (existingUser.isSystemUser) {
      return NextResponse.json(
        { error: "Cannot delete system users" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
} 