import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

interface Payment {
  amount: number;
}

interface Customer {
  name: string;
}

interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  dueDate: Date;
  status: string;
  createdAt: Date;
  customer: Customer;
  payments: Payment[];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      invoices.map((invoice: Invoice) => ({
        ...invoice,
        customerName: invoice.customer.name,
        totalPaid: invoice.payments.reduce((sum: number, p: Payment) => sum + p.amount, 0),
      }))
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { customerId, amount, dueDate, notes } = body;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-${Date.now()}`,
        customerId,
        amount,
        dueDate,
        notes,
        status: "pending"
      }
    });

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNo: `INV-${Date.now()}`,
        date: new Date(),
        description: `Invoice #${invoice.id}`,
        status: "POSTED",
        postedAt: new Date()
      }
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error creating invoice:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 