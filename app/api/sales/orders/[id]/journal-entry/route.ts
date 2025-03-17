import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get the order with its items
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.journalEntryId) {
      return NextResponse.json(
        { error: "Journal entry already exists for this order" },
        { status: 400 }
      );
    }

    // Get the accounts needed for the journal entry from ChartOfAccount
    const [salesAccount, accountsReceivable] = await Promise.all([
      prisma.chartOfAccount.findFirst({
        where: {
          type: "REVENUE",
          category: "OPERATING_REVENUE",
          name: "Sales"
        }
      }),
      prisma.chartOfAccount.findFirst({
        where: {
          type: "ASSET",
          category: "CURRENT_ASSET",
          name: "Accounts Receivable"
        }
      })
    ]);

    if (!salesAccount || !accountsReceivable) {
      return NextResponse.json(
        { 
          error: "Required accounts not found. Please set up Sales and Accounts Receivable accounts first.",
          details: {
            salesAccount: salesAccount ? "Found" : "Missing",
            accountsReceivable: accountsReceivable ? "Found" : "Missing"
          }
        },
        { status: 400 }
      );
    }

    // Generate entry number (format: SO-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        entryNo: {
          startsWith: `SO-${dateStr}`
        }
      },
      orderBy: {
        entryNo: 'desc'
      }
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSequence = parseInt(lastEntry.entryNo.split("-")[2]);
      sequence = lastSequence + 1;
    }

    const entryNo = `SO-${dateStr}-${sequence.toString().padStart(3, "0")}`;

    // Create the journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNo,
        date: order.createdAt,
        description: `Sales Order ${order.orderNo} - ${order.customer.name}`,
        status: "POSTED",
        postedAt: new Date(),
        items: {
          create: [
            {
              // Debit Accounts Receivable
              accountId: accountsReceivable.id,
              description: `Invoice for Order ${order.orderNo}`,
              debit: order.totalAmount,
              credit: 0
            },
            {
              // Credit Sales Revenue
              accountId: salesAccount.id,
              description: `Revenue from Order ${order.orderNo}`,
              debit: 0,
              credit: order.totalAmount
            }
          ]
        }
      }
    });

    // Update the order with the journal entry reference
    await prisma.order.update({
      where: { id: order.id },
      data: {
        journalEntryId: journalEntry.id,
        status: "completed"
      }
    });

    // Update account balances
    await prisma.$transaction([
      prisma.chartOfAccount.update({
        where: { id: accountsReceivable.id },
        data: {
          balance: {
            increment: order.totalAmount
          }
        }
      }),
      prisma.chartOfAccount.update({
        where: { id: salesAccount.id },
        data: {
          balance: {
            increment: order.totalAmount
          }
        }
      })
    ]);

    return NextResponse.json({
      message: "Journal entry created successfully",
      journalEntry
    });
  } catch (error) {
    console.error("[ORDER_JOURNAL_ENTRY_POST]", error);
    return NextResponse.json(
      { 
        error: "Failed to create journal entry", 
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 