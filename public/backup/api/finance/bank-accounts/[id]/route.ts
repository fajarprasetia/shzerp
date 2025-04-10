import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Reference to the mock data from the main route
// This is just for development when the database table doesn't exist
import { mockBankAccounts } from "../route";

// GET handler to fetch a specific bank account
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication in production
    if (process.env.NODE_ENV === "production") {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.log("Development mode: Bypassing authentication for bank accounts API");
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    let account;
    
    try {
      // Try to fetch the bank account from the database
      account = await prisma.bankAccount.findUnique({
        where: { id },
      });
      
      if (account) {
        return NextResponse.json(account);
      }
      
      // If no account was found in the database but the table exists, return 404
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    } catch (error) {
      // If the table doesn't exist or there's another error, use mock data in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[BANK_ACCOUNTS_GET_BY_ID] Using mock data due to error:", error);
        account = mockBankAccounts.find(a => a.id === id);
        
        if (!account) {
          return NextResponse.json(
            { error: "Bank account not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json(account);
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_GET_BY_ID] Error fetching account:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("[BANK_ACCOUNTS_GET_BY_ID] Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank account" },
      { status: 500 }
    );
  }
}

// PATCH handler to update a specific bank account
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication in production
    if (process.env.NODE_ENV === "production") {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.log("Development mode: Bypassing authentication for bank accounts API");
    }

    const { id } = params;
    const data = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    let account;
    
    try {
      // Try to update the bank account in the database
      account = await prisma.bankAccount.update({
        where: { id },
        data: {
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          balance: parseFloat(data.balance) || 0,
          currency: data.currency || "IDR",
          status: data.status || "active",
          description: data.description || "",
        },
      });
      
      return NextResponse.json(account);
    } catch (error) {
      // If the table doesn't exist or there's another error, update mock data in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[BANK_ACCOUNTS_PATCH_BY_ID] Using mock data due to error:", error);
        const mockIndex = mockBankAccounts.findIndex(a => a.id === id);
        if (mockIndex >= 0) {
          mockBankAccounts[mockIndex] = {
            ...mockBankAccounts[mockIndex],
            ...data,
            updatedAt: new Date(),
          };
          account = mockBankAccounts[mockIndex];
          return NextResponse.json(account);
        } else {
          return NextResponse.json(
            { error: "Bank account not found" },
            { status: 404 }
          );
        }
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_PATCH_BY_ID] Error updating account:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("[BANK_ACCOUNTS_PATCH_BY_ID] Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a specific bank account
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication in production
    if (process.env.NODE_ENV === "production") {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.log("Development mode: Bypassing authentication for bank accounts API");
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    try {
      // Try to delete the bank account from the database
      await prisma.bankAccount.delete({
        where: { id },
      });
      
      return NextResponse.json({ success: true });
    } catch (error) {
      // If the table doesn't exist or there's another error, handle mock data in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[BANK_ACCOUNTS_DELETE_BY_ID] Using mock data due to error:", error);
        const mockIndex = mockBankAccounts.findIndex(a => a.id === id);
        if (mockIndex >= 0) {
          mockBankAccounts.splice(mockIndex, 1);
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json(
            { error: "Bank account not found" },
            { status: 404 }
          );
        }
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_DELETE_BY_ID] Error deleting account:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("[BANK_ACCOUNTS_DELETE_BY_ID] Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete bank account" },
      { status: 500 }
    );
  }
} 