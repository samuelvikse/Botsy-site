/**
 * Shared CORS header utilities.
 */

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://botsy.no'
const ADMIN_ORIGIN = process.env.ADMIN_APP_URL || 'https://admin.botsy.no'

/** Allowed origins for admin API routes */
const ALLOWED_ORIGINS = [APP_ORIGIN, ADMIN_ORIGIN]

/**
 * Get the correct Access-Control-Allow-Origin header based on the request origin.
 * Returns the matching origin if it's in the allowed list, otherwise the default APP_ORIGIN.
 */
export function getAllowedOrigin(requestOrigin?: string | null): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin
  }
  return APP_ORIGIN
}

/**
 * CORS headers for admin-only API routes.
 * Uses ADMIN_ORIGIN since the admin panel is the primary caller.
 * The middleware also sets CORS headers dynamically based on request origin.
 */
export const adminCorsHeaders = {
  'Access-Control-Allow-Origin': ADMIN_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

/**
 * Get dynamic CORS headers based on request origin.
 * Returns headers matching the request's origin if it's allowed.
 */
export function getAdminCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

/**
 * CORS headers for public/widget-facing API routes.
 * Allows requests from any origin (needed for customer websites embedding the widget).
 */
export const widgetCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
