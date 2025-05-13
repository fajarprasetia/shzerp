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

    const entry = await prisma.journalEntry.findUnique({
      where: { id: id },
      include: {
        items: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true
              }
            }
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true
          }
        },
        postedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[JOURNAL_ENTRY_GET]", error);
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
    const { date, description, reference, items } = body;

    // Get the current entry
    const currentEntry = await prisma.journalEntry.findUnique({
      where: { id: id }
    });

    if (!currentEntry) {
      return new NextResponse("Journal entry not found", { status: 404 });
    }

    if (currentEntry.status !== "DRAFT") {
      return new NextResponse("Only draft entries can be modified", { status: 400 });
    }

    if (!date || !description || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate debits equal credits
    const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      return new NextResponse("Total debits must equal total credits", { status: 400 });
    }

    // Update the entry and its items
    const entry = await prisma.journalEntry.update({
      where: { id: id },
      data: {
        date: new Date(date),
        description,
        reference,
        items: {
          deleteMany: {}, // Delete all existing items
          create: items.map(item => ({
            accountId: item.accountId,
            description: item.description,
            debit: item.debit || 0,
            credit: item.credit || 0
          }))
        }
      },
      include: {
        items: {
          include: {
            account: true
          }
        }
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[JOURNAL_ENTRY_PUT]", error);
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

    // Get the current entry
    const entry = await prisma.journalEntry.findUnique({
      where: { id: id }
    });

    if (!entry) {
      return new NextResponse("Journal entry not found", { status: 404 });
    }

    if (entry.status !== "DRAFT") {
      return new NextResponse("Only draft entries can be deleted", { status: 400 });
    }

    // Delete the entry (this will cascade delete the items)
    await prisma.journalEntry.delete({
      where: { id: id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[JOURNAL_ENTRY_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 