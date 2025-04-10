import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
import { Order, Customer } from "@prisma/client";

interface OrderWithCustomer extends Order {
  customer: Customer;
}

interface CollectionOrder {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  status: "overdue" | "in_collection" | "legal" | "written_off";
  lastContactDate?: Date | null;
  nextFollowUp?: Date | null;
  notes?: string;
}

export async function GET() {
  try {
    // In development mode, bypass authentication
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Bypassing authentication for collections API");
    } else {
      // Only check authentication in production
      const session = await auth();
      if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Get all overdue orders
    const overdueOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Orders older than 30 days
        },
        totalAmount: {
          gt: 0,
        },
      },
      include: {
        customer: true,
      },
    });

    // Transform the data for the collections view
    const collectionsData: CollectionOrder[] = overdueOrders.map((order: OrderWithCustomer) => {
      const daysOverdue = differenceInDays(new Date(), order.createdAt);
      let status: "overdue" | "in_collection" | "legal" | "written_off";

      // Determine collection status based on days overdue
      if (daysOverdue <= 30) {
        status = "overdue";
      } else if (daysOverdue <= 60) {
        status = "in_collection";
      } else if (daysOverdue <= 90) {
        status = "legal";
      } else {
        status = "written_off";
      }

      return {
        id: order.id,
        invoiceNo: order.orderNo,
        customerId: order.customerId,
        customerName: order.customer.name,
        amount: order.totalAmount,
        dueDate: order.createdAt,
        daysOverdue,
        status,
        lastContactDate: null,
        nextFollowUp: null,
        notes: order.note || "",
      };
    });

    return NextResponse.json(collectionsData);
  } catch (error) {
    console.error("Error in collections API:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    // In development mode, bypass authentication
    if (process.env.NODE_ENV !== "production") {
      console.log("Development mode: Bypassing authentication for collections API PATCH");
    } else {
      // Only check authentication in production
      const session = await auth();
      if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const body = await request.json();
    const { id, status, lastContactDate, nextFollowUp, notes } = body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        note: notes,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
      },
    });

    const daysOverdue = differenceInDays(new Date(), order.createdAt);

    const response: CollectionOrder = {
      id: order.id,
      invoiceNo: order.orderNo,
      customerId: order.customerId,
      customerName: order.customer.name,
      amount: order.totalAmount,
      dueDate: order.createdAt,
      daysOverdue,
      status: status || "overdue",
      lastContactDate: lastContactDate ? new Date(lastContactDate) : null,
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      notes: order.note || "",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating collection status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 