import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { differenceInDays } from "date-fns";
import { Order, Customer } from "@prisma/client";
import { Prisma } from "@prisma/client";

interface OrderWithCustomer extends Order {
  customer: Customer;
}

interface AgingInvoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  status: "paid" | "unpaid" | "overdue";
}

interface AgingBucket {
  range: string;
  invoices: AgingInvoice[];
}

interface FormattedAgingBucket {
  range: string;
  count: number;
  total: number;
  invoices: AgingInvoice[];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
      // Check if the VendorBill table exists by attempting to count records
      const count = await prisma.vendorBill.count();
      
      // If we get here, the table exists, so fetch the data
      const bills = await prisma.vendorBill.findMany({
        where: {
          status: {
            not: "paid",
          },
        },
        include: {
          vendor: true,
          payments: true,
        },
      });

      const today = new Date();
      const agingData = bills.map((bill) => {
        const dueDate = new Date(bill.dueDate);
        const daysPastDue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const totalPaid = bill.payments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );
        const remainingAmount = bill.amount - totalPaid;

        let ageCategory = "";
        if (daysPastDue <= 0) {
          ageCategory = "current";
        } else if (daysPastDue <= 30) {
          ageCategory = "1-30";
        } else if (daysPastDue <= 60) {
          ageCategory = "31-60";
        } else if (daysPastDue <= 90) {
          ageCategory = "61-90";
        } else {
          ageCategory = "90+";
        }

        return {
          id: bill.id,
          billNo: bill.billNo,
          vendorId: bill.vendorId,
          vendorName: bill.vendor.name,
          issueDate: bill.issueDate,
          dueDate: bill.dueDate,
          amount: bill.amount,
          remainingAmount,
          daysPastDue: Math.max(0, daysPastDue),
          ageCategory,
        };
      });

      return NextResponse.json(agingData);
    } catch (dbError) {
      // If the error is a PrismaClientKnownRequestError with code P2021, it means the table doesn't exist
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === 'P2021'
      ) {
        console.log("Vendor bills table doesn't exist yet, returning empty array");
        return NextResponse.json([]);
      }
      
      // For any other database error, log it and return an empty array
      console.error("Database error in aging-report GET:", dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error generating aging report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 