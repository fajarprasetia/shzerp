"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Account, ACCOUNT_TYPES } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface AccountListProps {
  accounts: Account[];
  isLoading?: boolean;
  onSelect?: (account: Account) => void;
}

export function AccountList({ accounts, isLoading, onSelect }: AccountListProps) {
  const getIcon = (iconName: string): LucideIcon => {
    return Icons[iconName as keyof typeof Icons] || Icons.HelpCircle;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const AccountIcon = getIcon(ACCOUNT_TYPES[account.type]?.icon || "HelpCircle");
            return (
              <TableRow
                key={account.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  onSelect && "cursor-pointer"
                )}
                onClick={() => onSelect?.(account)}
              >
                <TableCell>
                  <div className="flex items-center">
                    <AccountIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{account.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ACCOUNT_TYPES[account.type]?.label || account.type}
                  </Badge>
                </TableCell>
                <TableCell>{account.currency}</TableCell>
                <TableCell>
                  <Badge
                    variant={account.isActive ? "default" : "secondary"}
                    className={cn(
                      account.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    )}
                  >
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(account.balance)}
                </TableCell>
              </TableRow>
            );
          })}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                {isLoading ? "Loading..." : "No accounts found"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 