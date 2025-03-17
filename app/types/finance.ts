import { z } from "zod";

export const TRANSACTION_TYPES = {
  income: { label: "Income", color: "text-green-500" },
  expense: { label: "Expense", color: "text-red-500" },
  transfer: { label: "Transfer", color: "text-blue-500" },
} as const;

export const BUDGET_CATEGORIES = {
  supplies: { label: "Office Supplies", icon: "Package" },
  equipment: { label: "Equipment", icon: "Printer" },
  utilities: { label: "Utilities", icon: "Lightbulb" },
  rent: { label: "Rent & Facilities", icon: "Building" },
  software: { label: "Software & Licenses", icon: "Monitor" },
  payroll: { label: "Payroll", icon: "Users" },
  marketing: { label: "Marketing", icon: "TrendingUp" },
  travel: { label: "Travel & Transport", icon: "Plane" },
  maintenance: { label: "Maintenance", icon: "Wrench" },
  services: { label: "Professional Services", icon: "Briefcase" },
  training: { label: "Training & Development", icon: "GraduationCap" },
  other: { label: "Other", icon: "MoreHorizontal" },
} as const;

export const ACCOUNT_TYPES = {
  checking: { label: "Checking", icon: "Wallet" },
  savings: { label: "Savings", icon: "PiggyBank" },
  credit: { label: "Credit Card", icon: "CreditCard" },
  investment: { label: "Investment", icon: "TrendingUp" },
  cash: { label: "Cash", icon: "Banknote" },
} as const;

export const NOTIFICATION_TYPES = {
  transaction: { label: "Transaction", color: "text-blue-500" },
  budget: { label: "Budget Alert", color: "text-yellow-500" },
  reminder: { label: "Reminder", color: "text-purple-500" },
} as const;

export const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive(),
  description: z.string(),
  category: z.enum(Object.keys(BUDGET_CATEGORIES) as [keyof typeof BUDGET_CATEGORIES]),
  accountId: z.string(),
  date: z.date(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(Object.keys(ACCOUNT_TYPES) as [keyof typeof ACCOUNT_TYPES]),
  balance: z.number(),
  currency: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const budgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(Object.keys(BUDGET_CATEGORIES) as [keyof typeof BUDGET_CATEGORIES]),
  amount: z.number().positive(),
  spent: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  isRecurring: z.boolean(),
  recurringPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  notifications: z.boolean(),
  notificationThreshold: z.number().min(0).max(100).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(Object.keys(NOTIFICATION_TYPES) as [keyof typeof NOTIFICATION_TYPES]),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  data: z.record(z.any()).optional(),
  createdAt: z.date(),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type Notification = z.infer<typeof notificationSchema>;

export type TransactionType = keyof typeof TRANSACTION_TYPES;
export type BudgetCategory = keyof typeof BUDGET_CATEGORIES;
export type AccountType = keyof typeof ACCOUNT_TYPES;
export type NotificationType = keyof typeof NOTIFICATION_TYPES; 