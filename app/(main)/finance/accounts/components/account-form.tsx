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
import { Account, ACCOUNT_TYPES } from "@/types/finance";
import { useToast } from "@/components/ui/use-toast";

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(Object.keys(ACCOUNT_TYPES) as [keyof typeof ACCOUNT_TYPES], {
    required_error: "Type is required",
  }),
  balance: z.number().min(0, "Balance must be positive"),
  currency: z.string().min(1, "Currency is required"),
  isActive: z.boolean(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: Account | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const { toast } = useToast();
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          isActive: account.isActive,
        }
      : {
          name: "",
          type: "checking",
          balance: 0,
          currency: "IDR",
          isActive: true,
        },
  });

  const onSubmit = async (data: AccountFormData) => {
    try {
      const url = account
        ? `/api/finance/accounts/${account.id}`
        : "/api/finance/accounts";
      const method = account ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save account");
      }

      toast({
        title: `Account ${account ? "updated" : "created"} successfully`,
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
                <Input placeholder="Enter account name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPES).map(([key, { label }]) => (
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
          name="balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Balance</FormLabel>
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

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input placeholder="IDR" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Account will be included in totals and reports
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

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {account ? "Update" : "Create"} Account
          </Button>
        </div>
      </form>
    </Form>
  );
} 