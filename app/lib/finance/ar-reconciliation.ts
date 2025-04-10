import { prisma } from "@/lib/prisma";

interface ARReconciliationResult {
  totalAR: number;
  totalInvoices: number;
  totalPayments: number;
  discrepancies: {
    orderId: string;
    orderNo: string;
    customerName: string;
    invoiceAmount: number;
    totalPayments: number;
    difference: number;
  }[];
}

export async function reconcileAR(): Promise<ARReconciliationResult> {
  // Get all orders with their payments
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      payments: {
        where: {
          status: {
            in: ["approved", "COMPLETED"]
          }
        }
      }
    }
  });

  // Get AR account balance
  const arAccount = await prisma.chartOfAccount.findFirst({
    where: { name: "Accounts Receivable" }
  });

  if (!arAccount) {
    throw new Error("Accounts Receivable account not found");
  }

  // Calculate totals from orders
  let totalInvoices = 0;
  let totalPayments = 0;
  const discrepancies = [];

  for (const order of orders) {
    const orderPayments = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const difference = order.totalAmount - orderPayments;

    totalInvoices += order.totalAmount;
    totalPayments += orderPayments;

    if (Math.abs(difference) >= 0.01) {
      discrepancies.push({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customer.name,
        invoiceAmount: order.totalAmount,
        totalPayments: orderPayments,
        difference
      });
    }
  }

  return {
    totalAR: arAccount.balance,
    totalInvoices,
    totalPayments,
    discrepancies
  };
}

export async function fixARDiscrepancy(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      payments: {
        where: {
          status: {
            in: ["approved", "COMPLETED"]
          }
        }
      }
    }
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Calculate actual AR amount
  const totalPayments = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const actualAR = order.totalAmount - totalPayments;

  // Get AR account
  const arAccount = await prisma.chartOfAccount.findFirst({
    where: { name: "Accounts Receivable" }
  });

  if (!arAccount) {
    throw new Error("Accounts Receivable account not found");
  }

  // Create adjustment journal entry
  const entryNo = `AR-ADJ-${order.orderNo}`;
  
  await prisma.$transaction(async (tx) => {
    // Create journal entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNo,
        date: new Date(),
        description: `AR Adjustment for Order ${order.orderNo}`,
        status: "POSTED",
        postedAt: new Date(),
        items: {
          create: [
            {
              accountId: arAccount.id,
              description: `AR Adjustment - ${order.orderNo}`,
              debit: actualAR > 0 ? actualAR : 0,
              credit: actualAR < 0 ? Math.abs(actualAR) : 0
            }
          ]
        }
      }
    });

    // Update AR account balance
    await tx.chartOfAccount.update({
      where: { id: arAccount.id },
      data: {
        balance: {
          increment: actualAR
        }
      }
    });

    // Update order with journal entry reference
    await tx.order.update({
      where: { id: order.id },
      data: {
        journalEntryId: journalEntry.id
      }
    });
  });
} 