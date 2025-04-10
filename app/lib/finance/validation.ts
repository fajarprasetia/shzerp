import { z } from "zod";

// Schema for journal entry items
export const journalEntryItemSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  description: z.string().optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

// Schema for journal entries
export const journalEntrySchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  items: z.array(journalEntryItemSchema)
    .min(1, "At least one item is required")
    .refine((items) => {
      const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    }, "Total debits must equal total credits"),
});

// Validate account types for journal entries
export function validateAccountTypes(items: any[], accounts: any[]) {
  for (const item of items) {
    const account = accounts.find(a => a.id === item.accountId);
    if (!account) {
      throw new Error(`Account not found: ${item.accountId}`);
    }

    // Validate account type restrictions
    if (account.type === "ASSET" && item.credit > 0) {
      throw new Error(`Asset account ${account.name} cannot be credited`);
    }
    if (account.type === "LIABILITY" && item.debit > 0) {
      throw new Error(`Liability account ${account.name} cannot be debited`);
    }
  }
}

// Validate account balances
export function validateAccountBalances(items: any[], accounts: any[]) {
  for (const item of items) {
    const account = accounts.find(a => a.id === item.accountId);
    if (!account) continue;

    const newBalance = account.balance + (item.debit - item.credit);
    
    // Prevent negative balances for asset accounts
    if (account.type === "ASSET" && newBalance < 0) {
      throw new Error(`Insufficient balance in ${account.name}`);
    }
    
    // Prevent negative balances for liability accounts
    if (account.type === "LIABILITY" && newBalance < 0) {
      throw new Error(`Invalid balance in ${account.name}`);
    }
  }
}

// Validate AR transactions
export function validateARTransaction(items: any[], accounts: any[]) {
  const arAccount = accounts.find(a => a.name === "Accounts Receivable");
  if (!arAccount) return;

  const arItem = items.find(item => item.accountId === arAccount.id);
  if (!arItem) return;

  // Validate AR debit (invoice) has corresponding sales credit
  if (arItem.debit > 0) {
    const salesItem = items.find(item => {
      const account = accounts.find(a => a.id === item.accountId);
      return account?.type === "REVENUE" && item.credit === arItem.debit;
    });

    if (!salesItem) {
      throw new Error("AR debit must have corresponding sales credit");
    }
  }

  // Validate AR credit (payment) has corresponding cash debit
  if (arItem.credit > 0) {
    const cashItem = items.find(item => {
      const account = accounts.find(a => a.id === item.accountId);
      return account?.name === "Cash" && item.debit === arItem.credit;
    });

    if (!cashItem) {
      throw new Error("AR credit must have corresponding cash debit");
    }
  }
} 