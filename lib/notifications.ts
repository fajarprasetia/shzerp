import { prisma } from "./prisma";
import { formatCurrency } from "./utils";

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
    return null;
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
    title,
    message,
    type,
    userId,
    data,
  });
}

export async function notifyTransactionCreated(
  userId: string,
  amount: number,
  type: string,
  category: string
) {
  const title = `New ${type} Transaction`;
  const message = `A new ${type} transaction of ${formatCurrency(amount)} has been created in the ${category} category.`;

  return createFinanceNotification(
    'finance_transaction',
    title,
    message,
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
  const percentage = (spent / total) * 100;
  const title = `Budget Alert: ${budgetName}`;
  const message = `You have spent ${formatCurrency(spent)} (${percentage.toFixed(1)}%) of your ${category} budget.`;

  return createFinanceNotification(
    'finance_budget',
    title,
    message,
    userId,
    { budgetName, category, spent, total }
  );
}

export async function notifyAccountBalanceLow(
  userId: string,
  accountName: string,
  balance: number,
  threshold: number
) {
  const title = `Low Balance Alert: ${accountName}`;
  const message = `Your account balance (${formatCurrency(balance)}) has fallen below the threshold of ${formatCurrency(threshold)}.`;

  return createFinanceNotification(
    'finance_account',
    title,
    message,
    userId,
    { accountName, balance, threshold }
  );
} 