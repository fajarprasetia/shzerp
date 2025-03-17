"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface JournalEntryItem {
  id?: string;
  description?: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  entryNo: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  postedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: JournalEntryItem[];
}

const formSchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  items: z.array(z.object({
    description: z.string().optional(),
    debit: z.number().min(0),
    credit: z.number().min(0)
  })).min(1, "At least one item is required")
});

interface JournalEntryFormProps {
  entry?: JournalEntry | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalEntryForm({ entry, onSuccess, onCancel }: JournalEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: entry?.date || new Date(),
      description: entry?.description || "",
      reference: entry?.reference || "",
      items: entry?.items || [{ description: "", debit: 0, credit: 0 }]
    }
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      
      // Validate debits equal credits
      const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
      const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);
      
      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        toast({
          title: "Error",
          description: "Total debits must equal total credits",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        entry
          ? `/api/finance/journal-entries/${entry.id}`
          : "/api/finance/journal-entries",
        {
          method: entry ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save journal entry");
      }

      toast({
        title: "Success",
        description: `Journal entry has been ${entry ? "updated" : "created"}.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save journal entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const items = form.getValues("items");
    form.setValue("items", [...items, { description: "", debit: 0, credit: 0 }]);
  };

  const removeItem = (index: number) => {
    const items = form.getValues("items");
    if (items.length > 1) {
      form.setValue("items", items.filter((_, i) => i !== index));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
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
                  <Input {...field} />
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
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Items</h3>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {form.watch("items").map((_, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={index === 0 ? undefined : "sr-only"}>
                        Description
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel className={index === 0 ? undefined : "sr-only"}>
                        Debit
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FormLabel className={index === 0 ? undefined : "sr-only"}>
                        Credit
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={form.watch("items").length === 1}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : entry ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 