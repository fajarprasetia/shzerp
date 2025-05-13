import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface JournalEntryItem {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the journal entry with its items
    const entry = await prisma.journalEntry.findUnique({
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
          where: { id: id },
      include: {
        items: {
          include: {
            account: true
          }
        }
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    if (entry.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft entries can be posted" },
        { status: 400 }
      );
    }

    // Start a transaction to update account balances and post the entry
    const result = await prisma.$transaction(async (tx) => {
      // Update account balances
      for (const item of entry.items) {
        const account = await tx.account.findUnique({
          where: { id: item.accountId }
        });
        
        if (!account) continue;
        
        const newBalance = account.balance + (Number(item.debit) - Number(item.credit));
        await tx.account.update({
          where: { id: item.accountId },
          data: { balance: newBalance }
        });
      }

      // Update entry status to POSTED
      const updatedEntry = await prisma.journalEntry.update({
        where: { id: id },
        data: {
          status: "POSTED",
          postedAt: new Date()
        },
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
          }
        }
      });

      return updatedEntry;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[JOURNAL_ENTRY_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 