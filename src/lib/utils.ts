import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Round a monetary value to 2 decimal places. Money is stored as Float, so
 * every computed amount (line totals, discounts, cash differences) is rounded
 * here before it is persisted to stop IEEE-754 error from accumulating across
 * additions and report sums. (A full move to integer minor units — satang — is
 * the proper long-term fix; this bounds the drift in the meantime.)
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

// Payment methods. Stored values "CASH"/"QR" are kept for backward
// compatibility with existing orders and reports; only labels changed.
export type PaymentMethod = "CASH" | "QR" | "THAI_PLUS";

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  emoji: string;
}[] = [
  { value: "CASH", label: "เงินสด", emoji: "💵" },
  { value: "QR", label: "เงินโอน", emoji: "📱" },
  { value: "THAI_PLUS", label: "ไทยช่วยไทยพลัส", emoji: "🇹🇭" },
];

export function paymentMethodMeta(method: string): {
  label: string;
  emoji: string;
} {
  return (
    PAYMENT_METHODS.find((m) => m.value === method) ?? {
      label: method,
      emoji: "💳",
    }
  );
}
