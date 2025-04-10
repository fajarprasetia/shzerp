import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Define the resources that need permissions
const RESOURCES = [
  "dashboard",
  "inventory",
  "sales",
  "finance",
  "tasks",
  "users",
  "roles",
  "settings",
  "reports"
];

// Define the actions for each resource
const ACTIONS = ["read", "create", "update", "delete"];

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        role: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create admin role if it doesn't exist
    let adminRole = await prisma.role.findFirst({
      where: { name: "Administrator" }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: "Administrator",
          description: "System administrator with full access",
          isAdmin: true
        }
      });
    }

    // Assign the admin role to the user if they don't have a role
    if (!user.roleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          roleId: adminRole.id,
          isSystemAdmin: true
        }
      });
    }

    // Create permissions for each resource and action
    const existingPermissions = await prisma.permission.findMany({
      where: {
        roleId: adminRole.id
      }
    });

    const permissionsToCreate = [];

    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        // Check if permission already exists
        const exists = existingPermissions.some(
          p => p.resource === resource && p.action === action
        );

        if (!exists) {
          permissionsToCreate.push({
            roleId: adminRole.id,
            resource,
            action
          });
        }
      }
    }

    // Create missing permissions
    if (permissionsToCreate.length > 0) {
      await prisma.permission.createMany({
        data: permissionsToCreate
      });
    }

    return NextResponse.json({
      success: true,
      message: "Permissions set up successfully",
      permissionsCreated: permissionsToCreate.length
    });
  } catch (error) {
    console.error("Error setting up permissions:", error);
    return NextResponse.json(
      { error: "Failed to set up permissions" },
      { status: 500 }
    );
  }
} 