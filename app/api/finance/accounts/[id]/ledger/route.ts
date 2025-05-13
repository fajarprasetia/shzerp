import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all journal entry items for the account
    const items = await prisma.journalEntryItem.findMany({
      where: {
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
            accountId: id,
        journalEntry: {
          status: "POSTED"
        }
      },
      include: {
        journalEntry: true
      },
      orderBy: [
        {
          journalEntry: {
            date: 'asc'
          }
        },
        {
          journalEntry: {
            entryNo: 'asc'
          }
        }
      ]
    });

    // Transform the data for the ledger view
    const ledgerEntries = items.map(item => ({
      id: item.id,
      date: item.journalEntry.date,
      entryNo: item.journalEntry.entryNo,
      description: item.description || item.journalEntry.description,
      debit: item.debit,
      credit: item.credit
    }));

    return NextResponse.json(ledgerEntries);
  } catch (error) {
    console.error("[ACCOUNT_LEDGER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 