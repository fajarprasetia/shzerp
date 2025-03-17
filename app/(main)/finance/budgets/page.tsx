"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetList } from "./components/budget-list";
import { BudgetForm } from "./components/budget-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBudgets } from "../hooks/use-budgets";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Budget } from "@/types/finance";

export default function BudgetsPage() {
  const [isAddingBudget, setIsAddingBudget] = React.useState(false);
  const { budgets, isLoading, isError, mutate } = useBudgets();
  const [selectedBudget, setSelectedBudget] = React.useState<Budget | null>(null);

  const handleSuccess = () => {
    setIsAddingBudget(false);
    setSelectedBudget(null);
    mutate();
  };

  // Calculate totals with safe defaults
  const totalBudget = React.useMemo(() => 
    Array.isArray(budgets) ? budgets.reduce((sum, budget) => sum + (budget.amount || 0), 0) : 0
  , [budgets]);

  const totalSpent = React.useMemo(() => 
    Array.isArray(budgets) ? budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0) : 0
  , [budgets]);

  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-lg border border-destructive p-4">
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p className="text-muted-foreground">Failed to load budgets. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-[140px]" />
                <Skeleton className="h-4 w-[180px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Manage and track your budget allocations
          </p>
        </div>
        <Button onClick={() => setIsAddingBudget(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Budget
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Budget</CardTitle>
            <CardDescription>All active budgets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(totalBudget)}
            </div>
            <Progress value={overallProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {overallProgress.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Budgets</CardTitle>
            <CardDescription>Number of budget categories</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {Array.isArray(budgets) ? budgets.length : 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Spent</CardTitle>
            <CardDescription>Across all budgets</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(totalSpent)}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <BudgetList
          budgets={Array.isArray(budgets) ? budgets : []}
          isLoading={isLoading}
          onSelect={setSelectedBudget}
        />
      </div>

      <Dialog
        open={isAddingBudget || !!selectedBudget}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingBudget(false);
            setSelectedBudget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedBudget ? "Edit Budget" : "Add Budget"}
            </DialogTitle>
          </DialogHeader>
          <BudgetForm
            budget={selectedBudget}
            onSuccess={handleSuccess}
            onCancel={() => {
              setIsAddingBudget(false);
              setSelectedBudget(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 