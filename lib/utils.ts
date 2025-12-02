// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize phone number input (remove non-allowed characters)
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d\s\-\+\(\)]/g, '').substring(0, 20);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Calculate percentage safely
 */
export function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}