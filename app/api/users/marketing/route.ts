import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("Fetching marketing users...");
    
    // First check if we have any users with Marketing role
    const roleCheck = await prisma.role.findFirst({
      where: {
        name: "Marketing"
      }
    });
    
    console.log("Marketing role exists:", !!roleCheck);
    
    // Fetch all users to see what's available
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: true
      }
    });
    
    console.log("All users count:", allUsers.length);
    console.log("Sample user:", allUsers.length > 0 ? allUsers[0] : "No users found");
    
    // Fetch users with the Marketing role
    const marketingUsers = await prisma.user.findMany({
      where: {
        role: {
          name: "Marketing"
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: "asc"
      }
    });
    
    console.log("Marketing users found:", marketingUsers.length);

    // If no marketing users found, return all users for testing
    if (marketingUsers.length === 0) {
      return NextResponse.json(allUsers.slice(0, 5));
    }

    return NextResponse.json(marketingUsers);
  } catch (error) {
    console.error("Error fetching marketing users:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketing users" },
      { status: 500 }
    );
  }
} 