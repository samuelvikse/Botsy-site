import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decode leftover unicode escape sequences (e.g. \u00e5 → å) that survive
 * JSON.parse when an LLM double-escapes characters in its JSON output.
 */
export function fixUnicodeEscapes(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}
