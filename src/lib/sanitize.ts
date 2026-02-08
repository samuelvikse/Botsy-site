/**
 * Input sanitization utilities for security.
 */

/**
 * Escape HTML entities to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitize a string for use in email From/Subject headers.
 * Prevents email header injection by removing newlines and special characters.
 */
export function sanitizeEmailHeader(str: string): string {
  return str
    .replace(/[\r\n]/g, '') // Remove newlines (header injection)
    .replace(/[<>]/g, '')   // Remove angle brackets
    .trim()
    .slice(0, 100) // Limit length
}

/** Max allowed customer message length */
const MAX_MESSAGE_LENGTH = 2000

/**
 * Known prompt injection markers that should be stripped from customer input.
 * These are role-prefixes that could confuse the AI model.
 */
const INJECTION_MARKERS = [
  /^SYSTEM:\s*/i,
  /^ASSISTANT:\s*/i,
  /^INSTRUCTION:\s*/i,
  /^\[SYSTEM\]\s*/i,
  /^\[INST\]\s*/i,
  /^<\|im_start\|>system/i,
  /^<\|system\|>/i,
]

/**
 * Sanitize customer message input before passing to the AI model.
 * - Truncates to MAX_MESSAGE_LENGTH
 * - Strips known role-prefix injection markers
 */
export function sanitizePromptInput(message: string): string {
  let sanitized = message.trim()

  // Truncate overly long messages
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH)
  }

  // Strip known injection markers from the start of the message
  for (const marker of INJECTION_MARKERS) {
    sanitized = sanitized.replace(marker, '')
  }

  return sanitized.trim()
}
