import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
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

    // Get the journal entry with its items
    const entry = await prisma.journalEntry.findUnique({
      where: { id: id },
      include: {
        items: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    if (entry.status === "POSTED") {
      return NextResponse.json(
        { error: "Journal entry is already posted" },
        { status: 400 }
      );
    }

    // Verify that the entry is balanced (debits = credits)
    const totalDebits = entry.items
      .filter((item) => item.debit)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalCredits = entry.items
      .filter((item) => !item.debit)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    if (totalDebits.toFixed(2) !== totalCredits.toFixed(2)) {
      return NextResponse.json(
        { 
          error: "Journal entry is not balanced",
          totalDebits,
          totalCredits
        },
        { status: 400 }
      );
    }

    // Post the journal entry
    const postedEntry = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        postedBy: session.user.id,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(postedEntry);
  } catch (error) {
    console.error("[JOURNAL_ENTRY_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 