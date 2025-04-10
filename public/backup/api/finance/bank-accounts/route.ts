import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Mock data for development - only used as fallback when database table doesn't exist
export const mockBankAccounts = [
  {
    id: "1",
    accountName: "Main Business Account",
    accountNumber: "1234567890",
    bankName: "BCA",
    balance: 25000000,
    currency: "IDR",
    status: "active",
    description: "Primary business account for daily operations",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    accountName: "Savings Account",
    accountNumber: "0987654321",
    bankName: "Mandiri",
    balance: 15000000,
    currency: "IDR",
    status: "active",
    description: "Savings account for reserves",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    accountName: "Tax Account",
    accountNumber: "5678901234",
    bankName: "BNI",
    balance: 5000000,
    currency: "IDR",
    status: "active",
    description: "Account for tax payments",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// GET handler to fetch all bank accounts
export async function GET() {
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

    let accounts;
    
    try {
      // Try to fetch bank accounts from the database
      accounts = await prisma.bankAccount.findMany({
        orderBy: { createdAt: "desc" },
      });
      
      // If we got accounts from the database, return them
      if (accounts && accounts.length > 0) {
        return NextResponse.json(accounts);
      }
      
      // If no accounts were found in the database, try to create the table and seed it
      console.log("No bank accounts found in database, attempting to create and seed table");
      
      // Create mock accounts in the database
      const createdAccounts = await Promise.all(
        mockBankAccounts.map(account => 
          prisma.bankAccount.create({
            data: {
              accountName: account.accountName,
              accountNumber: account.accountNumber,
              bankName: account.bankName,
              balance: account.balance,
              currency: account.currency,
              status: account.status,
              description: account.description,
            }
          })
        )
      );
      
      return NextResponse.json(createdAccounts);
    } catch (error) {
      // If the table doesn't exist or there's another error, use mock data in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[BANK_ACCOUNTS_GET] Using mock data due to error:", error);
        accounts = mockBankAccounts;
        return NextResponse.json(accounts);
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_GET] Error fetching accounts:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("[BANK_ACCOUNTS_GET] Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}

// POST handler to create a new bank account
export async function POST(request: Request) {
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

    const data = await request.json();
    
    // Validate required fields
    if (!data.accountName || !data.accountNumber || !data.bankName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let account;
    
    try {
      // Try to create a bank account in the database
      account = await prisma.bankAccount.create({
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
      
      return NextResponse.json(account, { status: 201 });
    } catch (error) {
      // If the table doesn't exist, try to create it
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        console.log("[BANK_ACCOUNTS_POST] Table does not exist, attempting to create it");
        
        try {
          // Create the bank account table and add the account
          // This is a simplified approach - in a real app, you would use migrations
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "BankAccount" (
              "id" TEXT NOT NULL,
              "accountName" TEXT NOT NULL,
              "accountNumber" TEXT NOT NULL,
              "bankName" TEXT NOT NULL,
              "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
              "currency" TEXT NOT NULL DEFAULT 'IDR',
              "status" TEXT NOT NULL DEFAULT 'active',
              "description" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
            )
          `;
          
          // Try creating the account again
          account = await prisma.bankAccount.create({
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
          
          return NextResponse.json(account, { status: 201 });
        } catch (createError) {
          console.error("[BANK_ACCOUNTS_POST] Error creating table:", createError);
          
          // If we still can't create the table, use mock data in development
          if (process.env.NODE_ENV !== "production") {
            console.log("[BANK_ACCOUNTS_POST] Using mock data as fallback");
            account = {
              ...data,
              id: (mockBankAccounts.length + 1).toString(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockBankAccounts.push(account);
            return NextResponse.json(account, { status: 201 });
          } else {
            throw createError;
          }
        }
      }
      
      // For other errors, use mock data in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[BANK_ACCOUNTS_POST] Using mock data due to error:", error);
        account = {
          ...data,
          id: (mockBankAccounts.length + 1).toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockBankAccounts.push(account);
        return NextResponse.json(account, { status: 201 });
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_POST] Error creating account:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("[BANK_ACCOUNTS_POST] Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}

// PATCH handler to update a bank account
export async function PATCH(request: Request) {
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

    const data = await request.json();
    const { id, ...updateData } = data;
    
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
          accountName: updateData.accountName,
          accountNumber: updateData.accountNumber,
          bankName: updateData.bankName,
          balance: parseFloat(updateData.balance) || 0,
          currency: updateData.currency || "IDR",
          status: updateData.status || "active",
          description: updateData.description || "",
        },
      });
      
      return NextResponse.json(account);
    } catch (error) {
      // If the table doesn't exist or there's another error, return mock data in development
      if (process.env.NODE_ENV !== "production") {
        console.log("[BANK_ACCOUNTS_PATCH] Using mock data due to error:", error);
        const mockIndex = mockBankAccounts.findIndex(a => a.id === id);
        if (mockIndex >= 0) {
          mockBankAccounts[mockIndex] = {
            ...mockBankAccounts[mockIndex],
            ...updateData,
            updatedAt: new Date(),
          };
          account = mockBankAccounts[mockIndex];
        } else {
          return NextResponse.json(
            { error: "Bank account not found" },
            { status: 404 }
          );
        }
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_PATCH] Error updating account:", error);
        throw error;
      }
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("[BANK_ACCOUNTS_PATCH] Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a bank account
export async function DELETE(request: Request) {
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

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
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
        console.log("[BANK_ACCOUNTS_DELETE] Using mock data due to error:", error);
        const mockIndex = mockBankAccounts.findIndex(a => a.id === id);
        if (mockIndex >= 0) {
          mockBankAccounts.splice(mockIndex, 1);
        } else {
          return NextResponse.json(
            { error: "Bank account not found" },
            { status: 404 }
          );
        }
      } else {
        // In production, we want to know about the error
        console.error("[BANK_ACCOUNTS_DELETE] Error deleting account:", error);
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BANK_ACCOUNTS_DELETE] Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete bank account" },
      { status: 500 }
    );
  }
} 