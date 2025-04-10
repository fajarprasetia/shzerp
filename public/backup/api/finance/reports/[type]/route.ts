import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Transaction {
  type: "credit" | "debit";
  amount: number;
  bankAccount: {
    id: string;
    name: string;
    balance: number;
  };
}

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  status: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
}

interface Bill {
  id: string;
  amount: number;
  status: string;
}

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { date } = await request.json();
    const reportDate = new Date(date);

    // Get start and end of month for the selected date
    const startOfMonth = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
    const endOfMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);

    switch (params.type) {
      case "pl": {
        try {
          // Get all transactions for the month
          const transactions = await prisma.transaction.findMany({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            include: {
              bankAccount: true,
            },
          });

          // Calculate totals
          const income = transactions
            .filter((t: Transaction) => t.type === "credit")
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

          const expenses = transactions
            .filter((t: Transaction) => t.type === "debit")
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

          const netProfit = income - expenses;

          // Return P&L data
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            income,
            expenses,
            netProfit,
            transactions,
          });
        } catch (error) {
          console.error("Error generating P&L report:", error);
          // Return empty data if table doesn't exist
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            income: 0,
            expenses: 0,
            netProfit: 0,
            transactions: [],
          });
        }
      }

      case "bs": {
        try {
          // Get all bank accounts and their balances
          const bankAccounts = await prisma.bankAccount.findMany({
            where: {
              status: "active",
            },
          });

          // Get all receivables
          const receivables = await prisma.invoice.findMany({
            where: {
              status: "pending",
            },
          });

          // Get all payables
          const payables = await prisma.bill.findMany({
            where: {
              status: "pending",
            },
          });

          // Calculate totals
          const totalAssets = bankAccounts.reduce((sum: number, acc: BankAccount) => sum + acc.balance, 0) +
            receivables.reduce((sum: number, inv: Invoice) => sum + inv.amount, 0);

          const totalLiabilities = payables.reduce((sum: number, bill: Bill) => sum + bill.amount, 0);

          const equity = totalAssets - totalLiabilities;

          // Return balance sheet data
          return NextResponse.json({
            date: reportDate,
            assets: {
              bankAccounts,
              receivables,
              total: totalAssets,
            },
            liabilities: {
              payables,
              total: totalLiabilities,
            },
            equity,
          });
        } catch (error) {
          console.error("Error generating balance sheet report:", error);
          // Return empty data if tables don't exist
          return NextResponse.json({
            date: reportDate,
            assets: {
              bankAccounts: [],
              receivables: [],
              total: 0,
            },
            liabilities: {
              payables: [],
              total: 0,
            },
            equity: 0,
          });
        }
      }

      case "cf": {
        try {
          // Get all transactions for the month
          const transactions = await prisma.transaction.findMany({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            include: {
              bankAccount: true,
              category: true,
            },
            orderBy: {
              date: 'asc',
            },
          });

          // Get beginning balance
          const beginningBalances = await prisma.bankAccount.findMany({
            select: {
              id: true,
              accountName: true,
              balance: true,
            },
          });

          // Calculate cash flow by category
          const categorySummary = transactions.reduce((acc: any, transaction: any) => {
            const categoryName = transaction.category?.name || 'Uncategorized';
            if (!acc[categoryName]) {
              acc[categoryName] = {
                inflow: 0,
                outflow: 0,
              };
            }
            
            if (transaction.type === 'credit') {
              acc[categoryName].inflow += transaction.amount;
            } else {
              acc[categoryName].outflow += transaction.amount;
            }
            
            return acc;
          }, {});

          // Calculate totals
          const totalInflow = transactions
            .filter((t: any) => t.type === 'credit')
            .reduce((sum: number, t: any) => sum + t.amount, 0);
            
          const totalOutflow = transactions
            .filter((t: any) => t.type === 'debit')
            .reduce((sum: number, t: any) => sum + t.amount, 0);
            
          const netCashFlow = totalInflow - totalOutflow;

          // Calculate ending balances
          const endingBalances = beginningBalances.map((account: any) => {
            const accountTransactions = transactions.filter((t: any) => t.bankAccountId === account.id);
            const accountInflow = accountTransactions
              .filter((t: any) => t.type === 'credit')
              .reduce((sum: number, t: any) => sum + t.amount, 0);
            const accountOutflow = accountTransactions
              .filter((t: any) => t.type === 'debit')
              .reduce((sum: number, t: any) => sum + t.amount, 0);
            
            return {
              ...account,
              endingBalance: account.balance + accountInflow - accountOutflow,
            };
          });

          // Return cash flow data
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            beginningBalances,
            endingBalances,
            transactions,
            categorySummary,
            totalInflow,
            totalOutflow,
            netCashFlow,
          });
        } catch (error) {
          console.error("Error generating cash flow report:", error);
          // Return empty data if tables don't exist
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            beginningBalances: [],
            endingBalances: [],
            transactions: [],
            categorySummary: {},
            totalInflow: 0,
            totalOutflow: 0,
            netCashFlow: 0,
          });
        }
      }

      case "sales": {
        try {
          // Get all sales for the month
          const sales = await prisma.invoice.findMany({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
            orderBy: {
              date: 'asc',
            },
          });

          // Calculate sales by customer
          const customerSummary = sales.reduce((acc: any, invoice: any) => {
            const customerName = invoice.customer?.name || 'Unknown Customer';
            if (!acc[customerName]) {
              acc[customerName] = {
                total: 0,
                count: 0,
              };
            }
            
            acc[customerName].total += invoice.amount;
            acc[customerName].count += 1;
            
            return acc;
          }, {});

          // Calculate sales by product
          const productSummary = sales.reduce((acc: any, invoice: any) => {
            invoice.items.forEach((item: any) => {
              const productName = item.product?.name || 'Unknown Product';
              if (!acc[productName]) {
                acc[productName] = {
                  total: 0,
                  quantity: 0,
                };
              }
              
              acc[productName].total += item.amount;
              acc[productName].quantity += item.quantity;
            });
            
            return acc;
          }, {});

          // Calculate totals
          const totalSales = sales.reduce((sum: number, invoice: any) => sum + invoice.amount, 0);
          const totalInvoices = sales.length;

          // Return sales report data
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            sales,
            customerSummary,
            productSummary,
            totalSales,
            totalInvoices,
          });
        } catch (error) {
          console.error("Error generating sales report:", error);
          // Return empty data if tables don't exist
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            sales: [],
            customerSummary: {},
            productSummary: {},
            totalSales: 0,
            totalInvoices: 0,
          });
        }
      }

      case "expense": {
        try {
          // Get all expenses for the month
          const expenses = await prisma.bill.findMany({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            include: {
              vendor: true,
              items: {
                include: {
                  category: true,
                },
              },
            },
            orderBy: {
              date: 'asc',
            },
          });

          // Calculate expenses by category
          const categorySummary = expenses.reduce((acc: any, bill: any) => {
            bill.items.forEach((item: any) => {
              const categoryName = item.category?.name || 'Uncategorized';
              if (!acc[categoryName]) {
                acc[categoryName] = {
                  total: 0,
                };
              }
              
              acc[categoryName].total += item.amount;
            });
            
            return acc;
          }, {});

          // Calculate expenses by vendor
          const vendorSummary = expenses.reduce((acc: any, bill: any) => {
            const vendorName = bill.vendor?.name || 'Unknown Vendor';
            if (!acc[vendorName]) {
              acc[vendorName] = {
                total: 0,
                count: 0,
              };
            }
            
            acc[vendorName].total += bill.amount;
            acc[vendorName].count += 1;
            
            return acc;
          }, {});

          // Calculate totals
          const totalExpenses = expenses.reduce((sum: number, bill: any) => sum + bill.amount, 0);
          const totalBills = expenses.length;

          // Return expense report data
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            expenses,
            categorySummary,
            vendorSummary,
            totalExpenses,
            totalBills,
          });
        } catch (error) {
          console.error("Error generating expense report:", error);
          // Return empty data if tables don't exist
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            expenses: [],
            categorySummary: {},
            vendorSummary: {},
            totalExpenses: 0,
            totalBills: 0,
          });
        }
      }

      case "tax": {
        try {
          // Get all tax-related transactions for the month
          const taxTransactions = await prisma.transaction.findMany({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              category: {
                name: {
                  contains: 'Tax',
                },
              },
            },
            include: {
              category: true,
            },
            orderBy: {
              date: 'asc',
            },
          });

          // Calculate tax by type
          const taxSummary = taxTransactions.reduce((acc: any, transaction: any) => {
            const taxType = transaction.category?.name || 'Other Taxes';
            if (!acc[taxType]) {
              acc[taxType] = {
                total: 0,
                count: 0,
              };
            }
            
            acc[taxType].total += transaction.amount;
            acc[taxType].count += 1;
            
            return acc;
          }, {});

          // Calculate totals
          const totalTaxes = taxTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

          // Return tax report data
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            taxTransactions,
            taxSummary,
            totalTaxes,
          });
        } catch (error) {
          console.error("Error generating tax report:", error);
          // Return empty data if tables don't exist
          return NextResponse.json({
            startDate: startOfMonth,
            endDate: endOfMonth,
            taxTransactions: [],
            taxSummary: {},
            totalTaxes: 0,
          });
        }
      }

      default:
        return new NextResponse("Invalid report type", { status: 400 });
    }
  } catch (error) {
    console.error("Error generating report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 