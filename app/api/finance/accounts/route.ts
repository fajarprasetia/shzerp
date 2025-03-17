import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const SYSTEM_ACCOUNTS = [
  {
    name: "Cash",
    type: "ASSET",
    balance: 0,
    currency: "IDR",
    lowBalanceAlert: 1000000, // 1M IDR minimum balance alert
    isSystemAccount: true
  },
  {
    name: "Accounts Receivable",
    type: "ASSET",
    balance: 0,
    currency: "IDR",
    lowBalanceAlert: null,
    isSystemAccount: true
  },
  {
    name: "Sales Revenue",
    type: "REVENUE",
    balance: 0,
    currency: "IDR",
    lowBalanceAlert: null,
    isSystemAccount: true
  },
  {
    name: "Cost of Goods Sold",
    type: "EXPENSE",
    balance: 0,
    currency: "IDR",
    lowBalanceAlert: null,
    isSystemAccount: true
  }
];

async function ensureSystemAccounts() {
  try {
    // Get the system user or create if doesn't exist
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@erp.local' }
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          name: 'System',
          email: 'system@erp.local',
          hashedPassword: 'system',
          isSystemUser: true
        }
      });
    }

    // Check for existing system accounts
    const existingAccounts = await prisma.financialAccount.findMany({
      where: { isSystemAccount: true }
    });

    if (existingAccounts.length === 0) {
      // Create system accounts
      await prisma.$transaction(
        SYSTEM_ACCOUNTS.map(account => 
          prisma.financialAccount.create({
            data: {
              ...account,
              userId: systemUser.id
            }
          })
        )
      );
    }

    return systemUser.id;
  } catch (error) {
    console.error("Error ensuring system accounts:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const systemUserId = await ensureSystemAccounts();
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch both system accounts and user accounts
    const accounts = await prisma.financialAccount.findMany({
      where: {
        OR: [
          { isSystemAccount: true },
          userId ? { userId } : {}
        ]
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[ACCOUNTS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, type, lowBalanceAlert } = body;

    const account = await prisma.financialAccount.create({
      data: {
        name,
        type,
        lowBalanceAlert: lowBalanceAlert ? parseFloat(lowBalanceAlert) : null,
        balance: 0,
        currency: "IDR",
        userId: session.user.id,
        isSystemAccount: false
      }
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("[ACCOUNTS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...data } = body;

    const account = await prisma.financialAccount.findUnique({
      where: { id }
    });

    if (!account || (account.userId !== session.user.id && !account.isSystemAccount)) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const updatedAccount = await prisma.financialAccount.update({
      where: { id },
      data: {
        ...data,
        lowBalanceAlert: data.lowBalanceAlert ? parseFloat(data.lowBalanceAlert) : null
      }
    });

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error("[ACCOUNTS_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    const account = await prisma.financialAccount.findUnique({
      where: { id }
    });

    if (!account || (account.userId !== session.user.id && !account.isSystemAccount)) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of system accounts
    if (account.isSystemAccount) {
      return NextResponse.json(
        { error: "Cannot delete system accounts" },
        { status: 403 }
      );
    }

    await prisma.financialAccount.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ACCOUNTS_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 