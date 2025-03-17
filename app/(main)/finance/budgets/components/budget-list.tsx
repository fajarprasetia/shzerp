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
import { Progress } from "@/components/ui/progress";
import { Budget, BUDGET_CATEGORIES } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface BudgetListProps {
  budgets: Budget[];
  isLoading?: boolean;
  onSelect?: (budget: Budget) => void;
}

export function BudgetList({ budgets, isLoading, onSelect }: BudgetListProps) {
  const getIcon = (iconName: string): LucideIcon => {
    return Icons[iconName as keyof typeof Icons] || Icons.HelpCircle;
  };

  const getProgressColor = (spent: number, amount: number) => {
    const percentage = (spent / amount) * 100;
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Spent</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.map((budget) => {
            const BudgetIcon = getIcon(BUDGET_CATEGORIES[budget.category]?.icon || "HelpCircle");
            const progressColor = getProgressColor(budget.spent, budget.amount);
            const progress = (budget.spent / budget.amount) * 100;

            return (
              <TableRow
                key={budget.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  onSelect && "cursor-pointer"
                )}
                onClick={() => onSelect?.(budget)}
              >
                <TableCell>
                  <div className="flex items-center">
                    <BudgetIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{budget.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {BUDGET_CATEGORIES[budget.category]?.label || budget.category}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {budget.isRecurring
                      ? budget.recurringPeriod
                      : `${new Date(budget.startDate).toLocaleDateString()} - ${new Date(
                          budget.endDate
                        ).toLocaleDateString()}`}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(budget.amount)}</TableCell>
                <TableCell>{formatCurrency(budget.spent)}</TableCell>
                <TableCell className="w-[200px]">
                  <div className="space-y-1">
                    <Progress
                      value={progress}
                      className={cn("h-2", progressColor)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {progress.toFixed(1)}% used
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {budgets.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                {isLoading ? "Loading..." : "No budgets found"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 