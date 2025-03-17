"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Budget, BUDGET_CATEGORIES } from "@/types/finance";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const budgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(Object.keys(BUDGET_CATEGORIES) as [keyof typeof BUDGET_CATEGORIES], {
    required_error: "Category is required",
  }),
  amount: z.number().positive("Amount must be positive"),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  isRecurring: z.boolean(),
  recurringPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  notifications: z.boolean(),
  notificationThreshold: z.number().min(0).max(100).optional(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  budget?: Budget | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BudgetForm({ budget, onSuccess, onCancel }: BudgetFormProps) {
  const { toast } = useToast();
  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: budget
      ? {
          name: budget.name,
          category: budget.category,
          amount: budget.amount,
          startDate: format(new Date(budget.startDate), "yyyy-MM-dd"),
          endDate: format(new Date(budget.endDate), "yyyy-MM-dd"),
          isRecurring: budget.isRecurring,
          recurringPeriod: budget.recurringPeriod,
          notifications: budget.notifications,
          notificationThreshold: budget.notificationThreshold,
        }
      : {
          name: "",
          category: "supplies",
          amount: 0,
          startDate: format(new Date(), "yyyy-MM-dd"),
          endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
          isRecurring: false,
          notifications: true,
          notificationThreshold: 80,
        },
  });

  const watchIsRecurring = form.watch("isRecurring");
  const watchNotifications = form.watch("notifications");

  const onSubmit = async (data: BudgetFormData) => {
    try {
      const url = budget
        ? `/api/finance/budgets/${budget.id}`
        : "/api/finance/budgets";
      const method = budget ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save budget");
      }

      toast({
        title: `Budget ${budget ? "updated" : "created"} successfully`,
        variant: "default",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter budget name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(BUDGET_CATEGORIES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Recurring Budget</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Automatically create new budget for each period
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchIsRecurring && (
          <FormField
            control={form.control}
            name="recurringPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recurring Period</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Budget Alerts</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Receive notifications when budget threshold is reached
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchNotifications && (
          <FormField
            control={form.control}
            name="notificationThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alert Threshold (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {budget ? "Update" : "Create"} Budget
          </Button>
        </div>
      </form>
    </Form>
  );
} 