import { NextResponse } from 'next/server'
import { logError, ErrorContext } from './error-logger'

/**
 * API Error Response Types
 */
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}

/**
 * Custom API Error class with additional context
 */
export class ApiError extends Error {
  public statusCode: number
  public code?: string
  public details?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

/**
 * Common API errors with Norwegian messages
 */
export const ApiErrors = {
  UNAUTHORIZED: new ApiError('Ikke autorisert', 401, 'UNAUTHORIZED'),
  FORBIDDEN: new ApiError('Ingen tilgang', 403, 'FORBIDDEN'),
  NOT_FOUND: new ApiError('Ressurs ikke funnet', 404, 'NOT_FOUND'),
  BAD_REQUEST: (message: string) => new ApiError(message, 400, 'BAD_REQUEST'),
  VALIDATION_ERROR: (message: string) => new ApiError(message, 422, 'VALIDATION_ERROR'),
  RATE_LIMITED: new ApiError('For mange forsok, prov igjen senere', 429, 'RATE_LIMITED'),
  INTERNAL_ERROR: new ApiError('En intern feil oppstod', 500, 'INTERNAL_ERROR'),
  SERVICE_UNAVAILABLE: new ApiError('Tjenesten er midlertidig utilgjengelig', 503, 'SERVICE_UNAVAILABLE'),
}

/**
 * CORS headers for API routes
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Handle API errors and return appropriate response
 */
export async function handleApiRoute<T>(
  handler: () => Promise<T>,
  context: ErrorContext = {},
  options: {
    corsEnabled?: boolean
    logPrefix?: string
  } = {}
): Promise<NextResponse<T | ApiErrorResponse>> {
  const { corsEnabled = false, logPrefix = '[API]' } = options
  const headers = corsEnabled ? corsHeaders : {}

  try {
    const result = await handler()
    return NextResponse.json(result as T, { headers })
  } catch (error) {
    // Log the error
    await logError(error, {
      ...context,
      action: context.action || 'api_request',
    })

    // Handle ApiError instances
    if (error instanceof ApiError) {
      console.error(`${logPrefix} ${error.code}: ${error.message}`)
      return NextResponse.json(
        {
          success: false as const,
          error: error.message,
          code: error.code,
          details: process.env.NODE_ENV === 'development' ? error.details : undefined,
        },
        { status: error.statusCode, headers }
      )
    }

    // Handle standard errors
    const errorMessage = error instanceof Error ? error.message : 'En uventet feil oppstod'
    console.error(`${logPrefix} Error:`, error)

    // Return generic error response in production
    return NextResponse.json(
      {
        success: false as const,
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'En intern feil oppstod',
      },
      { status: 500, headers }
    )
  }
}

/**
 * Wrapper for try-catch in API routes with logging
 * Use this when you need more control over the response
 */
export async function withErrorLogging<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    await logError(error, context)
    throw error
  }
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  options: { headers?: Record<string, string>; status?: number } = {}
): NextResponse<{ success: true } & T> {
  return NextResponse.json(
    { success: true as const, ...data },
    { status: options.status || 200, headers: options.headers || {} }
  )
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  options: {
    code?: string
    headers?: Record<string, string>
    details?: Record<string, unknown>
  } = {}
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: options.code,
      details: process.env.NODE_ENV === 'development' ? options.details : undefined,
    },
    { status: statusCode, headers: options.headers || {} }
  )
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  )

  if (missingFields.length > 0) {
    throw ApiErrors.VALIDATION_ERROR(
      `Manglende felt: ${missingFields.join(', ')}`
    )
  }
}
