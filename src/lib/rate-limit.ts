/**
 * Simple in-memory rate limiter for API routes
 * For production, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Every minute

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Check if a request is rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier

  let entry = rateLimitStore.get(key)

  // If no entry or expired, create new
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Subscription operations - 5 per minute
  subscription: {
    maxRequests: 5,
    windowMs: 60000,
  },
  // Portal access - 10 per minute
  portal: {
    maxRequests: 10,
    windowMs: 60000,
  },
  // Checkout - 3 per minute (prevent abuse)
  checkout: {
    maxRequests: 3,
    windowMs: 60000,
  },
  // General API - 30 per minute
  general: {
    maxRequests: 30,
    windowMs: 60000,
  },
  // Chat widget - 30 per minute
  chat: {
    maxRequests: 30,
    windowMs: 60000,
  },
  // Contact form - 5 per minute
  contact: {
    maxRequests: 5,
    windowMs: 60000,
  },
  // Email summary - 3 per minute
  emailSummary: {
    maxRequests: 3,
    windowMs: 60000,
  },
  // Feedback - 10 per minute
  feedback: {
    maxRequests: 10,
    windowMs: 60000,
  },
} as const

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(
  userId?: string,
  ip?: string | null
): string {
  // Prefer user ID for authenticated requests
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP
  if (ip) {
    return `ip:${ip}`
  }

  // Anonymous fallback
  return 'anonymous'
}
