import { prisma } from "@/lib/prisma";

interface CreateNotificationProps {
  title: string;
  message: string;
  type: string;
  userId: string;
  data?: Record<string, any>;
}

export async function createNotification({
  title,
  message,
  type,
  userId,
  data,
}: CreateNotificationProps) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId,
        data,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function createFinanceNotification(
  type: 'finance_transaction' | 'finance_budget' | 'finance_account',
  title: string,
  message: string,
  userId: string,
  data?: Record<string, any>
) {
  return createNotification({
    type,
    title,
    message,
    userId,
    data,
  });
}

// Helper functions for specific finance notifications
export async function notifyTransactionCreated(
  userId: string,
  amount: number,
  type: string,
  category: string
) {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount);

  return createFinanceNotification(
    'finance_transaction',
    'New Transaction',
    `A new ${type} transaction of ${formattedAmount} has been created in the ${category} category.`,
    userId,
    { amount, type, category }
  );
}

export async function notifyBudgetThreshold(
  userId: string,
  budgetName: string,
  category: string,
  spent: number,
  total: number
) {
  const percentage = Math.round((spent / total) * 100);
  
  return createFinanceNotification(
    'finance_budget',
    'Budget Alert',
    `Your ${budgetName} budget (${category}) has reached ${percentage}% of its limit.`,
    userId,
    { budgetName, category, spent, total, percentage }
  );
}

export async function notifyAccountBalanceLow(
  userId: string,
  accountName: string,
  balance: number,
  threshold: number
) {
  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(balance);

  return createFinanceNotification(
    'finance_account',
    'Low Balance Alert',
    `Your ${accountName} account balance (${formattedBalance}) is below the threshold of ${threshold}.`,
    userId,
    { accountName, balance, threshold }
  );
} 