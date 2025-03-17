"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Transaction } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  format,
} from "date-fns";
import { useOrders } from "@/app/sales/hooks/use-orders";
import { useInvoices } from "@/app/sales/hooks/use-invoices";

interface SalesReportProps {
  transactions: Transaction[];
  period: string;
  onExport: () => void;
}

interface SalesAnalysis {
  month: Date;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  invoicedAmount: number;
  collectionRate: number;
}

export function SalesReport({
  transactions,
  period,
  onExport,
}: SalesReportProps) {
  const { orders } = useOrders();
  const { invoices } = useInvoices();
  const [salesAnalysis, setSalesAnalysis] = React.useState<SalesAnalysis[]>([]);

  React.useEffect(() => {
    const now = new Date();
    const monthsToShow = period === "yearly" ? 12 : period === "quarterly" ? 3 : 1;
    const startDate = startOfMonth(subMonths(now, monthsToShow - 1));
    const endDate = endOfMonth(now);

    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const analysis = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      // Calculate revenue from transactions
      const monthTransactions = transactions?.filter(
        (t) =>
          new Date(t.date) >= monthStart &&
          new Date(t.date) <= monthEnd &&
          t.type === "income"
      ) || [];
      const revenue = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Calculate order metrics
      const monthOrders = orders?.filter(
        (o) =>
          new Date(o.createdAt) >= monthStart &&
          new Date(o.createdAt) <= monthEnd
      ) || [];
      const orderCount = monthOrders.length;
      const averageOrderValue =
        orderCount > 0
          ? monthOrders.reduce((sum, o) => sum + o.total, 0) / orderCount
          : 0;

      // Calculate invoice metrics
      const monthInvoices = invoices?.filter(
        (i) =>
          new Date(i.createdAt) >= monthStart &&
          new Date(i.createdAt) <= monthEnd
      ) || [];
      const invoicedAmount = monthInvoices.reduce((sum, i) => sum + i.total, 0);
      const collectionRate =
        invoicedAmount > 0 ? (revenue / invoicedAmount) * 100 : 0;

      return {
        month,
        revenue,
        orderCount,
        averageOrderValue,
        invoicedAmount,
        collectionRate,
      };
    });

    setSalesAnalysis(analysis);
  }, [transactions, orders, invoices, period]);

  const totalRevenue = salesAnalysis.reduce((sum, a) => sum + a.revenue, 0);
  const totalOrders = salesAnalysis.reduce((sum, a) => sum + a.orderCount, 0);
  const averageOrderValue =
    totalOrders > 0
      ? salesAnalysis.reduce((sum, a) => sum + a.averageOrderValue, 0) /
        salesAnalysis.length
      : 0;
  const totalInvoiced = salesAnalysis.reduce((sum, a) => sum + a.invoicedAmount, 0);
  const overallCollectionRate =
    totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Avg. {formatCurrency(averageOrderValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalInvoiced)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallCollectionRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sales Analysis</CardTitle>
            <CardDescription>
              Monthly sales performance and metrics
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Avg. Order</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Collection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesAnalysis.map((analysis) => (
                <TableRow key={analysis.month.toISOString()}>
                  <TableCell className="font-medium">
                    {format(analysis.month, "MMMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(analysis.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {analysis.orderCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(analysis.averageOrderValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(analysis.invoicedAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {analysis.collectionRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalRevenue)}
                </TableCell>
                <TableCell className="text-right">{totalOrders}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(averageOrderValue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalInvoiced)}
                </TableCell>
                <TableCell className="text-right">
                  {overallCollectionRate.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 