'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getUserPermissions() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        isSystemAdmin: false,
        isAdmin: false,
        permissions: [],
      };
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
      return {
        isSystemAdmin: false,
        isAdmin: false,
        permissions: [],
      };
    }

    return {
      isSystemAdmin: user.isSystemAdmin || false,
      isAdmin: user.role?.isAdmin || false,
      permissions: user.role?.permissions || [],
    };
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return {
      isSystemAdmin: false,
      isAdmin: false,
      permissions: [],
    };
  }
}

export async function hasPermission(resource: string, action: string = 'read') {
  const { isSystemAdmin, isAdmin, permissions } = await getUserPermissions();
  
  // System admins have access to everything
  if (isSystemAdmin) return true;
  
  // Admins have access to most things
  if (isAdmin && resource !== 'system') return true;
  
  // Check specific permissions
  return permissions.some(
    (permission) => permission.resource === resource && permission.action === action
  );
} 