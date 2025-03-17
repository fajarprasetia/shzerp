import { useMemo } from "react";
import { OrderItem } from "@prisma/client";

interface OrderFinanceInput {
  items?: OrderItem[];
  taxRate?: number;
  discount?: number;
  shippingCost?: number;
}

interface OrderFinanceResult {
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  formattedSubtotal: string;
  formattedTax: string;
  formattedDiscount: string;
  formattedShipping: string;
  formattedTotal: string;
}

export function useOrderFinance(params: OrderFinanceInput = {}): OrderFinanceResult {
  const {
    items = [],
    taxRate = 0.11, // 11% default tax rate
    discount = 0,
    shippingCost = 0,
  } = params;

  return useMemo(() => {
    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    // Calculate tax
    const tax = subtotal * taxRate;

    // Calculate discount
    const discountAmount = (subtotal * discount) / 100;

    // Calculate total
    const total = subtotal + tax - discountAmount + shippingCost;

    // Format currency values
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return {
      subtotal,
      tax,
      discount: discountAmount,
      shipping: shippingCost,
      total,
      formattedSubtotal: formatter.format(subtotal),
      formattedTax: formatter.format(tax),
      formattedDiscount: formatter.format(discountAmount),
      formattedShipping: formatter.format(shippingCost),
      formattedTotal: formatter.format(total),
    };
  }, [items, taxRate, discount, shippingCost]);
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to calculate item total
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

// Helper function to parse currency string to number
export function parseCurrency(value: string): number {
  // Remove currency symbol, dots, and other non-numeric characters
  const numericValue = value.replace(/[^0-9-]/g, '');
  return parseInt(numericValue, 10) || 0;
} 