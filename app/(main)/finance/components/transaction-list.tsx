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
import { Transaction, TRANSACTION_TYPES, BUDGET_CATEGORIES } from "@/types/finance";
import { formatCurrency, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  onSelect?: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onSelect }: TransactionListProps) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              onClick={() => onSelect?.(transaction)}
              className={onSelect ? "cursor-pointer hover:bg-accent/50" : ""}
            >
              <TableCell>
                {new Date(transaction.date).toLocaleDateString()}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>{transaction.category}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={transaction.type === "income" ? "success" : "destructive"}
                >
                  {transaction.type}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No transactions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 