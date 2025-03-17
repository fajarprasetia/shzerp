"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";

interface TaskSortProps {
  tasks: Task[];
  onSort: (sortedTasks: Task[]) => void;
  className?: string;
}

type SortField = "dueDate" | "priority" | "status" | "title";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const SORT_OPTIONS = [
  { value: "dueDate", label: "Due Date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title" },
] as const;

const PRIORITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_ORDER = {
  "todo": 1,
  "in-progress": 2,
  "completed": 3,
};

export function TaskSort({ tasks, onSort, className }: TaskSortProps) {
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    field: "dueDate",
    order: "asc",
  });

  React.useEffect(() => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const { field, order } = sortConfig;
      let comparison = 0;

      switch (field) {
        case "dueDate":
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "priority":
          comparison = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
          break;
        case "status":
          comparison = (STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0);
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return order === "asc" ? comparison : -comparison;
    });

    onSort(sortedTasks);
  }, [tasks, sortConfig, onSort]);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field ? (prev.order === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {SORT_OPTIONS.map(({ value, label }) => (
        <Button
          key={value}
          variant="outline"
          size="sm"
          className={sortConfig.field === value ? "bg-accent" : ""}
          onClick={() => handleSort(value as SortField)}
        >
          {label}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ))}
    </div>
  );
} 