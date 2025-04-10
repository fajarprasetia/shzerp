import { ChartOfAccount } from "@prisma/client";
import { z } from "zod";

export const journalEntrySchema = z.object({
  date: z.date(),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  items: z.array(z.object({
    accountId: z.string(),
    debit: z.number().min(0),
    credit: z.number().min(0),
    description: z.string().optional()
  })).min(1, "At least one item is required")
});

/**
 * Validates that the account types in journal entry items match the expected types
 */
export function validateAccountTypes(items: any[], accounts: ChartOfAccount[]) {
  const errors: string[] = [];

  for (const item of items) {
    const account = accounts.find(a => a.id === item.accountId);
    if (!account) {
      errors.push(`Account ${item.accountId} not found`);
      continue;
    }

    // Validate account types based on the transaction type
    if (item.debit > 0) {
      if (!['asset', 'expense'].includes(account.type.toLowerCase())) {
        errors.push(`Account ${account.name} (${account.code}) cannot be debited. Expected asset or expense account.`);
      }
    }

    if (item.credit > 0) {
      if (!['liability', 'equity', 'revenue'].includes(account.type.toLowerCase())) {
        errors.push(`Account ${account.name} (${account.code}) cannot be credited. Expected liability, equity, or revenue account.`);
      }
    }
  }

  return errors;
}

/**
 * Validates that the debit and credit amounts balance
 */
export function validateAccountBalances(items: any[], accounts: ChartOfAccount[]) {
  const errors: string[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of items) {
    totalDebit += Number(item.debit) || 0;
    totalCredit += Number(item.credit) || 0;
  }

  if (totalDebit !== totalCredit) {
    errors.push(`Debit total (${totalDebit}) does not equal credit total (${totalCredit})`);
  }

  return errors;
}

/**
 * Validates accounts receivable transactions
 */
export function validateARTransaction(items: any[], accounts: ChartOfAccount[]) {
  const errors: string[] = [];
  const arAccount = accounts.find(a => a.type.toLowerCase() === 'asset' && a.name.toLowerCase().includes('receivable'));
  
  if (!arAccount) {
    errors.push('Accounts Receivable account not found');
    return errors;
  }

  const arItem = items.find(item => item.accountId === arAccount.id);
  if (!arItem) {
    errors.push('Accounts Receivable account must be included in the transaction');
  }

  return errors;
}

/**
 * Validates a complete journal entry
 */
export function validateJournalEntry(items: any[], accounts: ChartOfAccount[]) {
  const errors: string[] = [];

  // Validate account types
  const typeErrors = validateAccountTypes(items, accounts);
  errors.push(...typeErrors);

  // Validate balances
  const balanceErrors = validateAccountBalances(items, accounts);
  errors.push(...balanceErrors);

  // Validate AR transaction if it's a sales-related entry
  const hasARAccount = items.some(item => {
    const account = accounts.find(a => a.id === item.accountId);
    return account?.type.toLowerCase() === 'asset' && account.name.toLowerCase().includes('receivable');
  });

  if (hasARAccount) {
    const arErrors = validateARTransaction(items, accounts);
    errors.push(...arErrors);
  }

  return errors;
} 