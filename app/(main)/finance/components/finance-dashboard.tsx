"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Calendar, FileText, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  pendingPayments: number;
  upcomingPayments: number;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

export function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    cashBalance: 0,
    pendingPayments: 0,
    upcomingPayments: 0,
    recentTransactions: []
  });

  const fetchFinancialSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/summary");
      if (!response.ok) {
        throw new Error(`Error fetching financial summary: ${response.statusText}`);
      }
      const data = await response.json();
      setFinancialSummary(data);
    } catch (err) {
      console.error("Failed to fetch financial summary:", err);
      setError("Failed to load financial data. Please try again later.");
      toast.error("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialSummary();
  }, []);

  const handleRefresh = () => {
    fetchFinancialSummary();
    toast.success("Financial data refreshed");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (error) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={fetchFinancialSummary} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Financial Overview</h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                  +12.5% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.netIncome)}</div>
                <p className="text-xs text-muted-foreground">
                  {financialSummary.netIncome > 0 ? '+' : ''}{((financialSummary.netIncome / financialSummary.totalRevenue) * 100).toFixed(1)}% profit margin
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cash Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(financialSummary.cashBalance)}</div>
                <p className="text-xs text-muted-foreground">
                  Updated today
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your most recent financial transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {financialSummary.recentTransactions.length > 0 ? (
                  financialSummary.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {transaction.type === 'credit' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent transactions found</p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">View All Transactions</Button>
          </CardFooter>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Financial Health</CardTitle>
            <CardDescription>
              Key financial indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Accounts Receivable</p>
                    <p className="text-xs text-muted-foreground">Outstanding customer payments</p>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(financialSummary.accountsReceivable)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Accounts Payable</p>
                    <p className="text-xs text-muted-foreground">Outstanding vendor payments</p>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(financialSummary.accountsPayable)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pending Payments</p>
                    <p className="text-xs text-muted-foreground">Expected incoming payments</p>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(financialSummary.pendingPayments)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Upcoming Payments</p>
                    <p className="text-xs text-muted-foreground">Due in the next 30 days</p>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(financialSummary.upcomingPayments)}</div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">View Receivables</Button>
            <Button variant="outline">View Payables</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Button variant="outline" className="justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Payment
            </Button>
            <Button variant="outline" className="justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 