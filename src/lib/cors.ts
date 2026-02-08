/**
 * Shared CORS header utilities.
 */

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://botsy.no'

/**
 * CORS headers for admin-only API routes.
 * Only allows requests from the Botsy app origin.
 */
export const adminCorsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
