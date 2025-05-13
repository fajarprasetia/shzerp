import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;

    const items = await prisma.journalEntryItem.findMany({
      where: {
        accountId: id,
        journalEntry: {
          status: "POSTED"
        }
      },
      include: {
        journalEntry: true,
      },
      orderBy: {
        journalEntry: {
          date: 'asc'
        }
      }
    });

    // Calculate running balance
    let balance = 0;
    const ledgerItems = items.map(item => {
      if (item.debit) {
        balance += Number(item.amount);
      } else {
        balance -= Number(item.amount);
      }
      
      return {
        id: item.id,
        date: item.journalEntry.date,
        description: item.journalEntry.description,
        reference: item.journalEntry.reference,
        debit: item.debit ? Number(item.amount) : 0,
        credit: !item.debit ? Number(item.amount) : 0,
        balance
      };
    });

    return NextResponse.json({ items: ledgerItems, balance });
  } catch (error) {
    console.error("[ACCOUNT_LEDGER_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 