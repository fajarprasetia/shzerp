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
import { format } from "date-fns";

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

  const formatDateRange = (startDate: Date, endDate?: Date | null) => {
    const start = format(new Date(startDate), "dd MMM yyyy");
    
    if (!endDate) {
      if (budgets.length > 0 && budgets[0].period === "monthly") {
        return `Monthly (from ${start})`;
      } else if (budgets.length > 0 && budgets[0].period === "quarterly") {
        return `Quarterly (from ${start})`;
      } else if (budgets.length > 0 && budgets[0].period === "yearly") {
        return `Yearly (from ${start})`;
      }
      return `From ${start}`;
    }
    
    const end = format(new Date(endDate), "dd MMM yyyy");
    return `${start} - ${end}`;
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
            const categoryData = typeof BUDGET_CATEGORIES[budget.category] === 'object' 
              ? BUDGET_CATEGORIES[budget.category] 
              : { label: BUDGET_CATEGORIES[budget.category], icon: 'HelpCircle' };
            
            const iconName = typeof categoryData === 'object' ? categoryData.icon : 'HelpCircle';
            const BudgetIcon = getIcon(iconName || "HelpCircle");
            
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
                        {typeof categoryData === 'object' ? categoryData.label : budget.category}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {budget.period !== "custom" 
                      ? budget.period.charAt(0).toUpperCase() + budget.period.slice(1)
                      : formatDateRange(budget.startDate, budget.endDate)}
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
              <TableCell colSpan={5} className="h-24 text-center">
                No budgets found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 