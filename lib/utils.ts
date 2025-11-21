// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Use this before dangerouslySetInnerHTML
 */
export function sanitizeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize phone number input (remove non-allowed characters)
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d\s\-\+\(\)]/g, '').substring(0, 20);
}