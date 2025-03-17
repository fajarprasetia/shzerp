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
import { Account, Transaction, ACCOUNT_TYPES } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

interface BalanceSheetReportProps {
  accounts: Account[];
  transactions: Transaction[];
  onExport: () => void;
}

interface AccountGroup {
  type: keyof typeof ACCOUNT_TYPES;
  accounts: Account[];
  total: number;
}

export function BalanceSheetReport({
  accounts,
  transactions,
  onExport,
}: BalanceSheetReportProps) {
  const accountGroups = React.useMemo(() => {
    const groups: { [key: string]: AccountGroup } = {};

    Object.keys(ACCOUNT_TYPES).forEach((type) => {
      groups[type] = {
        type: type as keyof typeof ACCOUNT_TYPES,
        accounts: [],
        total: 0,
      };
    });

    accounts?.forEach((account) => {
      if (account.isActive) {
        const group = groups[account.type];
        group.accounts.push(account);
        group.total += account.balance;
      }
    });

    return Object.values(groups);
  }, [accounts]);

  const totalAssets = accountGroups.reduce((sum, group) => {
    if (["checking", "savings", "investment", "cash"].includes(group.type)) {
      return sum + group.total;
    }
    return sum;
  }, 0);

  const totalLiabilities = accountGroups.reduce((sum, group) => {
    if (group.type === "credit") {
      return sum + group.total;
    }
    return sum;
  }, 0);

  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAssets)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalLiabilities)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netWorth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(netWorth)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <CardDescription>
              Statement of financial position
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Assets</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountGroups
                    .filter((group) =>
                      ["checking", "savings", "investment", "cash"].includes(
                        group.type
                      )
                    )
                    .map((group) => (
                      <TableRow key={group.type}>
                        <TableCell className="font-medium">
                          {ACCOUNT_TYPES[group.type].label}
                        </TableCell>
                        <TableCell>
                          {group.accounts.map((account) => (
                            <div key={account.id} className="text-sm">
                              {account.name}: {formatCurrency(account.balance)}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(group.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total Assets</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalAssets)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Liabilities</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountGroups
                    .filter((group) => group.type === "credit")
                    .map((group) => (
                      <TableRow key={group.type}>
                        <TableCell className="font-medium">
                          {ACCOUNT_TYPES[group.type].label}
                        </TableCell>
                        <TableCell>
                          {group.accounts.map((account) => (
                            <div key={account.id} className="text-sm">
                              {account.name}: {formatCurrency(account.balance)}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(group.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total Liabilities</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totalLiabilities)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <Table>
                <TableBody>
                  <TableRow className="font-bold text-lg">
                    <TableCell colSpan={2}>Net Worth</TableCell>
                    <TableCell
                      className={`text-right ${
                        netWorth >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(netWorth)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 