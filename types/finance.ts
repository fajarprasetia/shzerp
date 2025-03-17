import { z } from "zod";
import { Prisma } from "@prisma/client";

export const TRANSACTION_TYPES = {
  income: {
    label: "Income",
    color: "text-green-500",
  },
  expense: {
    label: "Expense",
    color: "text-red-500",
  },
} as const;

export const BUDGET_CATEGORIES = {
  salary: {
    label: "Salary",
    color: "text-green-500",
  },
  business: {
    label: "Business",
    color: "text-blue-500",
  },
  investment: {
    label: "Investment",
    color: "text-purple-500",
  },
  utilities: {
    label: "Utilities",
    color: "text-yellow-500",
  },
  rent: {
    label: "Rent",
    color: "text-orange-500",
  },
  food: {
    label: "Food",
    color: "text-red-500",
  },
  transport: {
    label: "Transport",
    color: "text-indigo-500",
  },
  entertainment: {
    label: "Entertainment",
    color: "text-pink-500",
  },
  other: {
    label: "Other",
    color: "text-gray-500",
  },
} as const;

export const ACCOUNT_TYPES = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE"
} as const;

export const ACCOUNT_CATEGORIES = {
  CURRENT_ASSET: "CURRENT_ASSET",
  FIXED_ASSET: "FIXED_ASSET",
  OTHER_ASSET: "OTHER_ASSET",
  CURRENT_LIABILITY: "CURRENT_LIABILITY",
  LONG_TERM_LIABILITY: "LONG_TERM_LIABILITY",
  OWNER_EQUITY: "OWNER_EQUITY",
  OPERATING_REVENUE: "OPERATING_REVENUE",
  OTHER_REVENUE: "OTHER_REVENUE",
  OPERATING_EXPENSE: "OPERATING_EXPENSE",
  OTHER_EXPENSE: "OTHER_EXPENSE"
} as const;

export const JOURNAL_ENTRY_STATUSES = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  VOID: "VOID"
} as const;

export const NOTIFICATION_TYPES = {
  transaction: { label: "Transaction", color: "text-blue-500" },
  budget: { label: "Budget Alert", color: "text-yellow-500" },
  reminder: { label: "Reminder", color: "text-purple-500" },
} as const;

export const transactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(["income", "expense"]),
  category: z.string(),
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
export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES];
export type NotificationType = keyof typeof NOTIFICATION_TYPES;
export type AccountCategory = typeof ACCOUNT_CATEGORIES[keyof typeof ACCOUNT_CATEGORIES];
export type JournalEntryStatus = typeof JOURNAL_ENTRY_STATUSES[keyof typeof JOURNAL_ENTRY_STATUSES];

// Types
export interface IAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  subcategory?: string | null;
  description?: string | null;
  parentId?: string | null;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJournalEntry {
  id: string;
  entryNo: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: JournalEntryStatus;
  postedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: IJournalEntryItem[];
}

export interface IJournalEntryItem {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  account?: IAccount;
  journalEntry?: IJournalEntry;
}

// Prisma Types with Relations
export type AccountWithRelations = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  subcategory?: string | null;
  description?: string | null;
  parentId?: string | null;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: AccountWithRelations | null;
  children?: AccountWithRelations[];
  journalEntries?: {
    id: string;
    journalEntryId: string;
    accountId: string;
    debit: number;
    credit: number;
    description?: string | null;
    journalEntry: {
      id: string;
      entryNo: string;
      date: Date;
      description: string;
      status: JournalEntryStatus;
    };
  }[];
};

export type JournalEntryWithItems = {
  id: string;
  entryNo: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: JournalEntryStatus;
  postedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    journalEntryId: string;
    accountId: string;
    debit: number;
    credit: number;
    description?: string | null;
    account: {
      id: string;
      code: string;
      name: string;
      type: AccountType;
    };
  }[];
};

// Report Types
export interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalanceSummary {
  totalDebit: number;
  totalCredit: number;
  byType: {
    [key in AccountType]: {
      debit: number;
      credit: number;
    };
  };
}

export interface TrialBalanceData {
  accounts: TrialBalanceRow[];
  summary: TrialBalanceSummary;
  asOfDate: string;
} 