import { Task as PrismaTask } from "@prisma/client";

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "work" | "personal" | "shopping" | "health" | "other";

export interface Task extends Omit<PrismaTask, "status" | "priority"> {
  status: TaskStatus;
  priority: TaskPriority;
  category?: TaskCategory;
  tags?: string[];
}

export const TASK_STATUSES = {
  todo: { label: "To Do", color: "#ff4444" },
  "in-progress": { label: "In Progress", color: "#4444ff" },
  done: { label: "Done", color: "#44ff44" }
} as const;

export const TASK_PRIORITIES = {
  low: { label: "Low", color: "#44ff44" },
  medium: { label: "Medium", color: "#ffaa44" },
  high: { label: "High", color: "#ff4444" }
} as const;

export const TASK_CATEGORIES = {
  work: { label: "Work", color: "#4444ff" },
  personal: { label: "Personal", color: "#44ff44" },
  shopping: { label: "Shopping", color: "#ffaa44" },
  health: { label: "Health", color: "#ff4444" },
  other: { label: "Other", color: "#aaaaaa" }
} as const;

export const TASK_TAGS = [
  "urgent",
  "important",
  "meeting",
  "call",
  "email",
  "report",
  "review",
  "bug",
  "feature",
  "documentation"
] as const; 