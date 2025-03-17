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
import { Transaction, BUDGET_CATEGORIES } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  format,
} from "date-fns";

interface CashFlowReportProps {
  transactions: Transaction[];
  period: string;
  onExport: () => void;
}

interface MonthlyFlow {
  month: Date;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export function CashFlowReport({
  transactions,
  period,
  onExport,
}: CashFlowReportProps) {
  const [monthlyFlows, setMonthlyFlows] = React.useState<MonthlyFlow[]>([]);

  React.useEffect(() => {
    const now = new Date();
    const monthsToShow = period === "yearly" ? 12 : period === "quarterly" ? 3 : 1;
    const startDate = startOfMonth(subMonths(now, monthsToShow - 1));
    const endDate = endOfMonth(now);

    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const flows = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions?.filter(
        (t) =>
          new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd
      ) || [];

      const inflow = monthTransactions.reduce(
        (sum, t) => sum + (t.type === "income" ? t.amount : 0),
        0
      );
      const outflow = monthTransactions.reduce(
        (sum, t) => sum + (t.type === "expense" ? t.amount : 0),
        0
      );

      return {
        month,
        inflow,
        outflow,
        netFlow: inflow - outflow,
      };
    });

    setMonthlyFlows(flows);
  }, [transactions, period]);

  const totalInflow = monthlyFlows.reduce((sum, flow) => sum + flow.inflow, 0);
  const totalOutflow = monthlyFlows.reduce((sum, flow) => sum + flow.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const burnRate = totalOutflow / monthlyFlows.length;
  const runway = burnRate > 0 ? totalInflow / burnRate : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalInflow)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalOutflow)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netCashFlow >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netCashFlow)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(burnRate)}
              <span className="text-sm text-muted-foreground ml-2">
                ({runway.toFixed(1)} months runway)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cash Flow Statement</CardTitle>
            <CardDescription>
              Monthly cash inflows and outflows
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
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Net Flow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyFlows.map((flow) => (
                <TableRow key={flow.month.toISOString()}>
                  <TableCell className="font-medium">
                    {format(flow.month, "MMMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(flow.inflow)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(flow.outflow)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      flow.netFlow >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(flow.netFlow)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(totalInflow)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(totalOutflow)}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    netCashFlow >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(netCashFlow)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 