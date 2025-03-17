"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { JournalEntry, JournalEntryItem, Account } from "@prisma/client";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formSchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  items: z.array(z.object({
    accountId: z.string().min(1, "Account is required"),
    description: z.string().optional(),
    debit: z.number().min(0),
    credit: z.number().min(0),
  })).min(1, "At least one item is required")
    .refine((items) => {
      const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    }, "Total debits must equal total credits"),
});

interface JournalEntryFormProps {
  initialData?: JournalEntry | null;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
}

export function JournalEntryForm({ initialData, onSubmit, onCancel }: JournalEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      description: initialData?.description || "",
      reference: initialData?.reference || "",
      items: initialData?.items || [{ accountId: "", description: "", debit: 0, credit: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/finance/accounts");
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
  }, []);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const totalDebits = form.watch("items").reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredits = form.watch("items").reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter reference number" />
                </FormControl>
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter journal entry description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Journal Entry Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ accountId: "", description: "", debit: 0, credit: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.accountId`}
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.debit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Debit"
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? Number(value) : 0);
                            // Clear credit if debit is entered
                            if (value && Number(value) > 0) {
                              form.setValue(`items.${index}.credit`, 0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.credit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Credit"
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? Number(value) : 0);
                            // Clear debit if credit is entered
                            if (value && Number(value) > 0) {
                              form.setValue(`items.${index}.debit`, 0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-4 text-sm">
            <div>Total Debits: {totalDebits.toFixed(2)}</div>
            <div>Total Credits: {totalCredits.toFixed(2)}</div>
            <div>Difference: {Math.abs(totalDebits - totalCredits).toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                {initialData ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{initialData ? "Update" : "Create"} Journal Entry</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 