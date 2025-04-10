import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Initialize default values
    let totalRevenue = 0;
    let totalExpenses = 0;
    let netIncome = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;
    let cashBalance = 0;
    let pendingPayments = 0;
    let upcomingPayments = 0;
    let recentTransactions = [];
    
    // Track which data sources were successfully accessed
    const dataSourceStatus = {
      chartOfAccounts: false,
      financialAccounts: false,
      orders: false,
      payments: false,
      vendorBills: false,
      vendorPayments: false,
      transactions: false
    };

    // For development mode, we'll bypass authentication
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    try {
      // 1. Get revenue data
      try {
        // First try from Chart of Accounts
        const salesAccount = await prisma.chartOfAccount.findFirst({
          where: { 
            OR: [
              { name: "Sales" },
              { type: "revenue" }
            ]
          }
        });
        
        if (salesAccount) {
          totalRevenue = salesAccount.balance;
          dataSourceStatus.chartOfAccounts = true;
          console.log("Revenue from Chart of Accounts:", totalRevenue);
        }
      } catch (error) {
        console.log("Chart of Accounts not available:", error);
      }
      
      // If Chart of Accounts failed, try from Orders
      if (!dataSourceStatus.chartOfAccounts) {
        try {
          // Get all orders
          const orders = await prisma.order.findMany({
            include: {
              payments: true
            }
          });
          
          if (orders && orders.length > 0) {
            // Calculate total revenue from all orders
            totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            dataSourceStatus.orders = true;
            console.log("Revenue from Orders:", totalRevenue);
          }
        } catch (error) {
          console.log("Orders not available:", error);
        }
      }
      
      // 2. Get expense data
      try {
        // First try from Chart of Accounts
        const expenseAccounts = await prisma.chartOfAccount.findMany({
          where: { type: "expense" }
        });
        
        if (expenseAccounts && expenseAccounts.length > 0) {
          totalExpenses = expenseAccounts.reduce((sum, account) => sum + account.balance, 0);
          dataSourceStatus.chartOfAccounts = true;
          console.log("Expenses from Chart of Accounts:", totalExpenses);
        }
      } catch (error) {
        console.log("Chart of Accounts not available for expenses:", error);
      }
      
      // If Chart of Accounts failed, try from Vendor Bills
      if (!dataSourceStatus.chartOfAccounts) {
        try {
          // Get all vendor bills
          const vendorBills = await prisma.vendorBill.findMany();
          
          if (vendorBills && vendorBills.length > 0) {
            // Calculate total expenses from all vendor bills
            totalExpenses = vendorBills.reduce((sum, bill) => sum + bill.amount, 0);
            dataSourceStatus.vendorBills = true;
            console.log("Expenses from Vendor Bills:", totalExpenses);
          }
        } catch (error) {
          console.log("Vendor Bills not available:", error);
        }
      }

      // 3. Calculate net income
      netIncome = totalRevenue - totalExpenses;
      console.log("Net Income:", netIncome);

      // 4. Get accounts receivable
      try {
        // First try from Chart of Accounts
        const arAccount = await prisma.chartOfAccount.findFirst({
          where: { name: "Accounts Receivable" }
        });
        
        if (arAccount) {
          accountsReceivable = arAccount.balance;
          dataSourceStatus.chartOfAccounts = true;
          console.log("Accounts Receivable from Chart of Accounts:", accountsReceivable);
        }
      } catch (error) {
        console.log("Chart of Accounts not available for AR:", error);
      }
      
      // If Chart of Accounts failed, calculate from Orders and Payments
      if (!dataSourceStatus.chartOfAccounts) {
        try {
          // Get all orders and their payments
          const orders = await prisma.order.findMany({
            include: {
              payments: true
            }
          });
          
          if (orders && orders.length > 0) {
            // For each order, calculate the unpaid amount
            accountsReceivable = orders.reduce((sum, order) => {
              // Calculate total payments for this order
              const totalPayments = order.payments.reduce((paymentSum, payment) => {
                // Only count approved/completed payments
                if (payment.status === "approved" || payment.status === "COMPLETED") {
                  return paymentSum + payment.amount;
                }
                return paymentSum;
              }, 0);
              
              // Add the unpaid amount to accounts receivable
              const unpaidAmount = order.totalAmount - totalPayments;
              return sum + (unpaidAmount > 0 ? unpaidAmount : 0);
            }, 0);
            
            dataSourceStatus.orders = true;
            dataSourceStatus.payments = true;
            console.log("Accounts Receivable from Orders and Payments:", accountsReceivable);
          }
        } catch (error) {
          console.log("Orders or Payments not available for AR:", error);
        }
      }

      // 5. Get accounts payable
      try {
        // First try from Chart of Accounts
        const apAccount = await prisma.chartOfAccount.findFirst({
          where: { name: "Accounts Payable" }
        });
        
        if (apAccount) {
          accountsPayable = apAccount.balance;
          dataSourceStatus.chartOfAccounts = true;
          console.log("Accounts Payable from Chart of Accounts:", accountsPayable);
        }
      } catch (error) {
        console.log("Chart of Accounts not available for AP:", error);
      }
      
      // If Chart of Accounts failed, calculate from Vendor Bills and Payments
      if (!dataSourceStatus.chartOfAccounts) {
        try {
          // Get all vendor bills and their payments
          const vendorBills = await prisma.vendorBill.findMany({
            include: {
              payments: true
            }
          });
          
          if (vendorBills && vendorBills.length > 0) {
            // For each vendor bill, calculate the unpaid amount
            accountsPayable = vendorBills.reduce((sum, bill) => {
              // Calculate total payments for this bill
              const totalPayments = bill.payments.reduce((paymentSum, payment) => {
                // Only count approved/completed payments
                if (payment.status === "approved" || payment.status === "completed") {
                  return paymentSum + payment.amount;
                }
                return paymentSum;
              }, 0);
              
              // Add the unpaid amount to accounts payable
              const unpaidAmount = bill.amount - totalPayments;
              return sum + (unpaidAmount > 0 ? unpaidAmount : 0);
            }, 0);
            
            dataSourceStatus.vendorBills = true;
            dataSourceStatus.vendorPayments = true;
            console.log("Accounts Payable from Vendor Bills and Payments:", accountsPayable);
          }
        } catch (error) {
          console.log("Vendor Bills or Payments not available for AP:", error);
        }
      }

      // 6. Get cash balance
      try {
        // Try from Financial Accounts
        const cashAccounts = await prisma.financialAccount.findMany({
          where: { 
            type: "ASSET",
            OR: [
              { name: { contains: "Cash" } },
              { name: { contains: "Bank" } }
            ]
          }
        });
        
        if (cashAccounts && cashAccounts.length > 0) {
          cashBalance = cashAccounts.reduce((sum, account) => sum + account.balance, 0);
          dataSourceStatus.financialAccounts = true;
          console.log("Cash Balance from Financial Accounts:", cashBalance);
        }
      } catch (error) {
        console.log("Financial Accounts not available:", error);
        
        // Try from Chart of Accounts
        try {
          const cashAccounts = await prisma.chartOfAccount.findMany({
            where: { 
              type: "asset",
              OR: [
                { name: { contains: "Cash" } },
                { name: { contains: "Bank" } }
              ]
            }
          });
          
          if (cashAccounts && cashAccounts.length > 0) {
            cashBalance = cashAccounts.reduce((sum, account) => sum + account.balance, 0);
            dataSourceStatus.chartOfAccounts = true;
            console.log("Cash Balance from Chart of Accounts:", cashBalance);
          }
        } catch (chartError) {
          console.log("Chart of Accounts not available for cash:", chartError);
        }
      }

      // 7. Get pending payments (from unpaid orders)
      try {
        // Get all orders and their payments
        const orders = await prisma.order.findMany({
          include: {
            payments: true
          }
        });
        
        if (orders && orders.length > 0) {
          // For each order, calculate the unpaid amount
          pendingPayments = orders.reduce((sum, order) => {
            // Calculate total payments for this order
            const totalPayments = order.payments.reduce((paymentSum, payment) => {
              // Only count approved/completed payments
              if (payment.status === "approved" || payment.status === "COMPLETED") {
                return paymentSum + payment.amount;
              }
              return paymentSum;
            }, 0);
            
            // Add the unpaid amount to pending payments
            const unpaidAmount = order.totalAmount - totalPayments;
            return sum + (unpaidAmount > 0 ? unpaidAmount : 0);
          }, 0);
          
          dataSourceStatus.orders = true;
          dataSourceStatus.payments = true;
          console.log("Pending Payments from Orders:", pendingPayments);
        }
      } catch (error) {
        console.log("Orders or Payments not available for pending payments:", error);
      }

      // 8. Get upcoming payments (from vendor bills)
      try {
        // Get all vendor bills due in the next 30 days
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        const upcomingBills = await prisma.vendorBill.findMany({
          where: {
            dueDate: {
              gte: today,
              lte: thirtyDaysFromNow
            },
            status: {
              not: "paid"
            }
          },
          include: {
            payments: true
          }
        });
        
        if (upcomingBills && upcomingBills.length > 0) {
          // For each bill, calculate the unpaid amount
          upcomingPayments = upcomingBills.reduce((sum, bill) => {
            // Calculate total payments for this bill
            const totalPayments = bill.payments.reduce((paymentSum, payment) => {
              return paymentSum + payment.amount;
            }, 0);
            
            // Add the unpaid amount to upcoming payments
            const unpaidAmount = bill.amount - totalPayments;
            return sum + (unpaidAmount > 0 ? unpaidAmount : 0);
          }, 0);
          
          dataSourceStatus.vendorBills = true;
          dataSourceStatus.vendorPayments = true;
          console.log("Upcoming Payments from Vendor Bills:", upcomingPayments);
        }
      } catch (error) {
        console.log("Vendor Bills not available for upcoming payments:", error);
      }

      // 9. Get recent transactions
      try {
        // Try from Transactions
        const transactions = await prisma.transaction.findMany({
          orderBy: { date: "desc" },
          take: 5
        });
        
        if (transactions && transactions.length > 0) {
          recentTransactions = transactions.map(transaction => ({
            id: transaction.id,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type === "income" ? "credit" : "debit"
          }));
          
          dataSourceStatus.transactions = true;
          console.log("Recent Transactions from Transactions:", recentTransactions.length);
        }
      } catch (error) {
        console.log("Transactions not available:", error);
        
        // Try from Payments
        try {
          const payments = await prisma.payment.findMany({
            orderBy: { paymentDate: "desc" },
            take: 5,
            include: {
              order: {
                include: {
                  customer: true
                }
              }
            }
          });
          
          if (payments && payments.length > 0) {
            recentTransactions = payments.map(payment => ({
              id: payment.id,
              date: payment.paymentDate,
              description: `Payment for order ${payment.order?.orderNo || "Unknown"} from ${payment.order?.customer?.name || "Unknown"}`,
              amount: payment.amount,
              type: "credit"
            }));
            
            dataSourceStatus.payments = true;
            console.log("Recent Transactions from Payments:", recentTransactions.length);
          }
        } catch (paymentError) {
          console.log("Payments not available for recent transactions:", paymentError);
          
          // Try from Vendor Payments
          try {
            const vendorPayments = await prisma.vendorPayment.findMany({
              orderBy: { paymentDate: "desc" },
              take: 5,
              include: {
                bill: {
                  include: {
                    vendor: true
                  }
                }
              }
            });
            
            if (vendorPayments && vendorPayments.length > 0) {
              recentTransactions = vendorPayments.map(payment => ({
                id: payment.id,
                date: payment.paymentDate,
                description: `Payment for bill ${payment.bill?.billNo || "Unknown"} to ${payment.bill?.vendor?.name || "Unknown"}`,
                amount: payment.amount,
                type: "debit"
              }));
              
              dataSourceStatus.vendorPayments = true;
              console.log("Recent Transactions from Vendor Payments:", recentTransactions.length);
            }
          } catch (vendorPaymentError) {
            console.log("Vendor Payments not available for recent transactions:", vendorPaymentError);
          }
        }
      }
      
      // Log which data sources were successfully accessed
      console.log("Data source status:", dataSourceStatus);
      
      // Only use mock data if no real data was found
      const useRealData = Object.values(dataSourceStatus).some(status => status === true);
      
      if (!useRealData && isDevelopment) {
        console.log("No real data found, using mock data");
        
        // Generate mock data for development only if no real data was found
        totalRevenue = 25000000;
        totalExpenses = 18000000;
        netIncome = totalRevenue - totalExpenses;
        accountsReceivable = 8500000;
        accountsPayable = 5200000;
        cashBalance = 12000000;
        pendingPayments = 3500000;
        upcomingPayments = 2800000;
        recentTransactions = [
          {
            id: "1",
            date: new Date().toISOString(),
            description: "Customer payment",
            amount: 1500000,
            type: "credit"
          },
          {
            id: "2",
            date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            description: "Office supplies",
            amount: 250000,
            type: "debit"
          },
          {
            id: "3",
            date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            description: "Client invoice payment",
            amount: 3200000,
            type: "credit"
          }
        ];
      }
    } catch (dbError) {
      // If there's a database error, log it but continue with default values
      console.error("Database error in finance summary:", dbError);
      
      // If the error is a table not found error, we'll just use the default values
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2021') {
        console.log("Some tables don't exist yet, using default values");
      }
      
      // Generate some mock data for development
      if (isDevelopment) {
        console.log("Using mock data due to database error");
        
        totalRevenue = 25000000;
        totalExpenses = 18000000;
        netIncome = totalRevenue - totalExpenses;
        accountsReceivable = 8500000;
        accountsPayable = 5200000;
        cashBalance = 12000000;
        pendingPayments = 3500000;
        upcomingPayments = 2800000;
        recentTransactions = [
          {
            id: "1",
            date: new Date().toISOString(),
            description: "Customer payment",
            amount: 1500000,
            type: "credit"
          },
          {
            id: "2",
            date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            description: "Office supplies",
            amount: 250000,
            type: "debit"
          },
          {
            id: "3",
            date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            description: "Client invoice payment",
            amount: 3200000,
            type: "credit"
          }
        ];
      }
    }

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netIncome,
      accountsReceivable,
      accountsPayable,
      cashBalance,
      pendingPayments,
      upcomingPayments,
      recentTransactions
    });
  } catch (error) {
    console.error("Error generating finance summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 