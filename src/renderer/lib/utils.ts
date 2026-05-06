import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Check if the currently focused element is an input/textarea (excluding range inputs). */
export function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement && el.type !== 'range') return true;
  return false;
}
