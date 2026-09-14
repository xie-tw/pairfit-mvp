import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind class strings safely.
 *
 * Accepts the usual `clsx` inputs (strings, arrays, conditionals) and then
 * resolves Tailwind conflicts via `tailwind-merge`, so the last-applied
 * utility wins regardless of order.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
