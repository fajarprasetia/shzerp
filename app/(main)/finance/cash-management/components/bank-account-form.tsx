"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Form schema with validation
const formSchema = z.object({
  accountName: z.string().min(3, "Account name must be at least 3 characters"),
  accountNumber: z.string().min(5, "Account number must be at least 5 characters"),
  bankName: z.string().min(2, "Bank name must be at least 2 characters"),
  balance: z.coerce.number().min(0, "Balance cannot be negative"),
  currency: z.string().default("IDR"),
  status: z.enum(["active", "inactive"]).default("active"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BankAccountFormProps {
  account?: any;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function BankAccountForm({ account, onSuccess, onCancel }: BankAccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!account;

  // Initialize form with default values or existing account data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountName: account?.accountName || "",
      accountNumber: account?.accountNumber || "",
      bankName: account?.bankName || "",
      balance: account?.balance || 0,
      currency: account?.currency || "IDR",
      status: account?.status || "active",
      description: account?.description || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/finance/bank-accounts/${account.id}`
        : "/api/finance/bank-accounts";
      
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save bank account");
      }

      toast.success(
        isEditing ? "Bank account updated successfully" : "Bank account created successfully"
      );
      onSuccess();
    } catch (error) {
      console.error("Error saving bank account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save bank account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="Main Business Account" {...field} />
                </FormControl>
                <FormDescription>
                  The name you use to identify this account
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input placeholder="123456789" {...field} />
                </FormControl>
                <FormDescription>
                  The account number from your bank
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input placeholder="BCA" {...field} />
                </FormControl>
                <FormDescription>
                  The name of the bank
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Balance</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "0" : e.target.value;
                      field.onChange(parseFloat(value));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The current balance in the selected currency
                </FormDescription>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="RMB">RMB - Chinese Yuan</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The currency of this account
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Whether this account is currently in use
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Additional notes about this account" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Update Account" : "Create Account"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 