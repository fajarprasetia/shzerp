import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;

    const account = await prisma.account.findUnique({
      where: {
        id: id
      }
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("[ACCOUNT_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      code,
      name,
      type,
      category,
      subcategory,
      description,
      parentId
    } = body;

    if (!code || !name || !type || !category) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if account code already exists (excluding current account)
    const existingAccount = await prisma.account.findFirst({
      where: {
        code,
        NOT: {
          id: id
        }
      }
    });

    if (existingAccount) {
      return new NextResponse("Account code already exists", { status: 400 });
    }

    const account = await prisma.account.update({
      where: {
        id: id
      },
      data: {
        code,
        name,
        type,
        category,
        subcategory,
        description,
        parentId
      }
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("[ACCOUNT_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if account has any journal entries
    const hasJournalEntries = await prisma.journalEntryItem.findFirst({
      where: {
        accountId: id
      }
    });

    if (hasJournalEntries) {
      return new NextResponse(
        "Cannot delete account with existing journal entries",
        { status: 400 }
      );
    }

    // Check if account has any child accounts
    const hasChildren = await prisma.account.findFirst({
      where: {
        parentId: id
      }
    });

    if (hasChildren) {
      return new NextResponse(
        "Cannot delete account with child accounts",
        { status: 400 }
      );
    }

    await prisma.account.delete({
      where: {
        id: id
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ACCOUNT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 