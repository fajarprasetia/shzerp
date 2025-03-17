import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function calculateTotalPrice(quantity: number, price: number) {
  const subtotal = quantity * price;
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;
  return { tax, total };
}

export function generateBarcodeId() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `STK${timestamp}${random}`;
} 