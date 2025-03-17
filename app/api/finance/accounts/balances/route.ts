import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface AccountRecord {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  balance: bigint;
  updatedAt: Date;
}

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accounts = await prisma.account.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        category: true,
        balance: true,
        updatedAt: true,
      },
      orderBy: [
        { type: 'asc' },
        { code: 'asc' }
      ],
    });

    const formattedAccounts = accounts.map((account: AccountRecord) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category,
      balance: Number(account.balance),
      lastUpdated: account.updatedAt
    }));

    return NextResponse.json(formattedAccounts);
  } catch (error) {
    console.error("[ACCOUNT_BALANCES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
} 