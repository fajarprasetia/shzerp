import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
        const accountId = id;
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Initialize variables for tracking changes
    let newBalance = account.balance;
    let entriesAdded = 0;
    const now = new Date();
    const entryDate = now;
    
    // Check if this is an Accounts Receivable account
    if (account.name.toLowerCase().includes("receivable")) {
      try {
        // Calculate total accounts receivable from orders and payments
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
        
        let totalReceivable = 0;
        
        for (const order of orders) {
          const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
          const remaining = order.totalAmount - totalPaid;
          
          if (remaining > 0) {
            totalReceivable += remaining;
            
            // Create a journal entry for this receivable if it doesn't exist
            const existingEntry = await prisma.journalEntry.findFirst({
              where: {
                reference: `ORDER-${order.id}`,
                items: {
                  some: {
                    accountId: accountId
                  }
                }
              }
            });
            
            if (!existingEntry) {
              // Create a new journal entry
              await prisma.journalEntry.create({
                data: {
                  date: entryDate,
                  reference: `ORDER-${order.id}`,
                  description: `Accounts Receivable for Order #${order.orderNo} - ${order.customer?.name || 'Unknown Customer'}`,
                  items: {
                    create: [
                      {
                        accountId: accountId,
                        description: `Receivable for Order #${order.orderNo}`,
                        debit: remaining,
                        credit: 0
                      },
                      // Assuming there's a Sales/Revenue account
                      {
                        // Find a revenue/sales account
                        account: {
                          connect: {
                            // This is a simplification - in a real system you'd have a proper sales account
                            name: "Sales"
                          }
                        },
                        description: `Revenue for Order #${order.orderNo}`,
                        debit: 0,
                        credit: remaining
                      }
                    ]
                  }
                }
              });
              
              entriesAdded++;
            }
          }
        }
        
        // Update the account balance
        newBalance = totalReceivable;
        
        // Update the account
        await prisma.chartOfAccount.update({
          where: { id: accountId },
          data: {
            balance: newBalance,
            lastUpdated: now
          }
        });
        
        console.log(`Updated Accounts Receivable balance to ${newBalance}`);
      } catch (error) {
        console.error("Error syncing Accounts Receivable:", error);
        return NextResponse.json(
          { error: "Failed to sync Accounts Receivable" },
          { status: 500 }
        );
      }
    }
    
    // Check if this is an Accounts Payable account
    else if (account.name.toLowerCase().includes("payable")) {
      try {
        // Calculate total accounts payable from vendor bills and payments
        const vendorBills = await prisma.vendorBill.findMany({
          include: {
            vendor: true,
            payments: {
              where: {
                status: {
                  in: ["approved", "completed"]
                }
              }
            }
          }
        });
        
        let totalPayable = 0;
        
        for (const bill of vendorBills) {
          const totalPaid = bill.payments.reduce((sum, payment) => sum + payment.amount, 0);
          const remaining = bill.amount - totalPaid;
          
          if (remaining > 0) {
            totalPayable += remaining;
            
            // Create a journal entry for this payable if it doesn't exist
            const existingEntry = await prisma.journalEntry.findFirst({
              where: {
                reference: `BILL-${bill.id}`,
                items: {
                  some: {
                    accountId: accountId
                  }
                }
              }
            });
            
            if (!existingEntry) {
              // Create a new journal entry
              await prisma.journalEntry.create({
                data: {
                  date: entryDate,
                  reference: `BILL-${bill.id}`,
                  description: `Accounts Payable for Bill #${bill.billNo} - ${bill.vendor?.name || 'Unknown Vendor'}`,
                  items: {
                    create: [
                      {
                        accountId: accountId,
                        description: `Payable for Bill #${bill.billNo}`,
                        debit: 0,
                        credit: remaining
                      },
                      // Assuming there's an Expenses account
                      {
                        // Find an expense account
                        account: {
                          connect: {
                            // This is a simplification - in a real system you'd have a proper expense account
                            name: "Expenses"
                          }
                        },
                        description: `Expense for Bill #${bill.billNo}`,
                        debit: remaining,
                        credit: 0
                      }
                    ]
                  }
                }
              });
              
              entriesAdded++;
            }
          }
        }
        
        // Update the account balance
        newBalance = totalPayable;
        
        // Update the account
        await prisma.chartOfAccount.update({
          where: { id: accountId },
          data: {
            balance: newBalance,
            lastUpdated: now
          }
        });
        
        console.log(`Updated Accounts Payable balance to ${newBalance}`);
      } catch (error) {
        console.error("Error syncing Accounts Payable:", error);
        return NextResponse.json(
          { error: "Failed to sync Accounts Payable" },
          { status: 500 }
        );
      }
    }
    
    // For other accounts, just return the current balance
    else {
      return NextResponse.json({
        message: "This account type does not support automatic syncing",
        name: account.name,
        balance: account.balance
      });
    }

    return NextResponse.json({
      message: "Account synced successfully",
      name: account.name,
      balance: newBalance,
      entriesAdded
    });
  } catch (error) {
    console.error("Error syncing account:", error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      } else if (error.code === 'P2021') {
        return NextResponse.json(
          { error: "The table for this model does not exist" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 