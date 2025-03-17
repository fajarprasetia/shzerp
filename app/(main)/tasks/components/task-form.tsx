"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Task, TaskStatus, TaskPriority, TaskCategory, TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES, TASK_TAGS } from "@/types/task";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Fallback constants in case the imports fail
const FALLBACK_PRIORITIES = {
  'low': {
    label: 'Low',
    color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
  'medium': {
    label: 'Medium',
    color: 'bg-amber-200 text-amber-700 dark:bg-amber-700 dark:text-amber-200',
  },
  'high': {
    label: 'High',
    color: 'bg-red-200 text-red-700 dark:bg-red-700 dark:text-red-200',
  },
};

const FALLBACK_STATUSES = {
  'todo': {
    label: 'To Do',
    color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200',
  },
  'review': {
    label: 'Review',
    color: 'bg-amber-200 text-amber-700 dark:bg-amber-700 dark:text-amber-200',
  },
  'done': {
    label: 'Done',
    color: 'bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-200',
  },
};

const FALLBACK_CATEGORIES = {
  'work': {
    label: 'Work',
    color: 'bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200',
  },
  'personal': {
    label: 'Personal',
    color: 'bg-purple-200 text-purple-700 dark:bg-purple-700 dark:text-purple-200',
  },
  'learning': {
    label: 'Learning',
    color: 'bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-200',
  },
  'health': {
    label: 'Health',
    color: 'bg-red-200 text-red-700 dark:bg-red-700 dark:text-red-200',
  },
  'finance': {
    label: 'Finance',
    color: 'bg-emerald-200 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-200',
  },
  'other': {
    label: 'Other',
    color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
};

const FALLBACK_TAGS = [
  'urgent',
  'important',
  'meeting',
  'email',
  'call',
  'report',
  'presentation',
  'research',
  'development',
  'design',
  'testing',
  'documentation',
  'planning',
  'review',
];

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "review", "done"] as const),
  priority: z.enum(["low", "medium", "high"] as const),
  category: z.string().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  initialData?: Partial<Task>;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  // Use the imported constants or fallback to our local constants if they're undefined
  const priorities = TASK_PRIORITIES || FALLBACK_PRIORITIES;
  const statuses = TASK_STATUSES || FALLBACK_STATUSES;
  const categories = TASK_CATEGORIES || FALLBACK_CATEGORIES;
  const tags = TASK_TAGS || FALLBACK_TAGS;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: (initialData?.status as TaskStatus) || "todo",
      priority: (initialData?.priority as TaskPriority) || "medium",
      category: initialData?.category || undefined,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      tags: initialData?.tags || [],
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmitForm = async (data: TaskFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Task description" 
                  className="min-h-[100px] resize-none" 
                  {...field} 
                  disabled={isSubmitting} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(statuses).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(priorities).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(categories).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
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
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date || undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex flex-wrap gap-2 border rounded-md p-3">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={field.value?.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => {
                      if (isSubmitting) return;
                      const currentTags = field.value || [];
                      field.onChange(
                        currentTags.includes(tag)
                          ? currentTags.filter((t) => t !== tag)
                          : [...currentTags, tag]
                      );
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? "Update" : "Create"} Task
          </Button>
        </div>
      </form>
    </Form>
  );
} 