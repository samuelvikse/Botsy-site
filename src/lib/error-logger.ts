/**
 * Error Logger Utility
 *
 * A centralized error logging system that:
 * - Logs errors to console in development
 * - Can be extended to send to Sentry/other services in production
 * - Captures context like user ID, page, etc.
 */

// Types for error context
export interface ErrorContext {
  userId?: string
  companyId?: string
  page?: string
  action?: string
  componentName?: string
  additionalData?: Record<string, unknown>
}

export interface LoggedError {
  message: string
  stack?: string
  context: ErrorContext
  timestamp: string
  environment: string
  url?: string
  userAgent?: string
}

// Configuration - can be extended with environment variables
const config = {
  // Set to true to enable remote error reporting
  enableRemoteLogging: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
  // Sentry DSN - add when ready to integrate
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Environment
  environment: process.env.NODE_ENV || 'development',
  // App version (useful for tracking errors across deployments)
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
}

/**
 * Determines if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Get browser information for error context
 */
function getBrowserInfo(): { url?: string; userAgent?: string } {
  if (!isBrowser()) return {}

  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
  }
}

/**
 * Format error for logging
 */
function formatError(error: Error | unknown, context: ErrorContext = {}): LoggedError {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  const browserInfo = getBrowserInfo()

  return {
    message: errorObj.message,
    stack: errorObj.stack,
    context,
    timestamp: new Date().toISOString(),
    environment: config.environment,
    ...browserInfo,
  }
}

/**
 * Log to console (development)
 */
function logToConsole(loggedError: LoggedError, severity: 'error' | 'warn' | 'info' = 'error'): void {
  const prefix = `[Botsy ${severity.toUpperCase()}]`

  console[severity](
    `${prefix} ${loggedError.message}`,
    '\n',
    'Context:', loggedError.context,
    '\n',
    'Timestamp:', loggedError.timestamp,
    '\n',
    'Stack:', loggedError.stack
  )
}

/**
 * Send error to remote service (Sentry placeholder)
 * This function can be extended to integrate with Sentry or other services
 */
async function sendToRemoteService(loggedError: LoggedError): Promise<void> {
  if (!config.enableRemoteLogging) return

  // Sentry integration placeholder
  // When ready to integrate Sentry, uncomment and configure:
  /*
  if (config.sentryDsn && typeof Sentry !== 'undefined') {
    Sentry.withScope((scope) => {
      // Add context
      if (loggedError.context.userId) {
        scope.setUser({ id: loggedError.context.userId })
      }
      if (loggedError.context.companyId) {
        scope.setTag('companyId', loggedError.context.companyId)
      }
      if (loggedError.context.page) {
        scope.setTag('page', loggedError.context.page)
      }
      if (loggedError.context.action) {
        scope.setTag('action', loggedError.context.action)
      }
      if (loggedError.context.componentName) {
        scope.setTag('component', loggedError.context.componentName)
      }
      if (loggedError.context.additionalData) {
        scope.setExtras(loggedError.context.additionalData)
      }

      Sentry.captureException(new Error(loggedError.message))
    })
    return
  }
  */

  // Alternative: Send to custom endpoint
  // This can be used for custom error tracking services
  const errorEndpoint = process.env.NEXT_PUBLIC_ERROR_ENDPOINT
  if (errorEndpoint) {
    try {
      await fetch(errorEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...loggedError,
          appVersion: config.appVersion,
        }),
      })
    } catch {
      // Silently fail - we don't want error logging to cause more errors
      console.warn('[Botsy] Failed to send error to remote service')
    }
  }
}

/**
 * Main error logging function
 * Use this to log errors throughout the application
 */
export async function logError(
  error: Error | unknown,
  context: ErrorContext = {}
): Promise<void> {
  const loggedError = formatError(error, context)

  // Always log to console in development
  if (config.environment === 'development') {
    logToConsole(loggedError, 'error')
  }

  // Send to remote service in production
  if (config.environment === 'production') {
    await sendToRemoteService(loggedError)
  }
}

/**
 * Log a warning (less severe than error)
 */
export async function logWarning(
  message: string,
  context: ErrorContext = {}
): Promise<void> {
  const loggedError = formatError(new Error(message), context)

  if (config.environment === 'development') {
    logToConsole(loggedError, 'warn')
  }

  if (config.environment === 'production' && config.enableRemoteLogging) {
    // For Sentry: Use Sentry.captureMessage with 'warning' level
    await sendToRemoteService(loggedError)
  }
}

/**
 * Log an info message (for tracking important events)
 */
export function logInfo(
  message: string,
  context: ErrorContext = {}
): void {
  if (config.environment === 'development') {
    const loggedError = formatError(new Error(message), context)
    logToConsole(loggedError, 'info')
  }
}

/**
 * Create a context-aware logger for a specific component/module
 * This makes it easier to maintain consistent context across multiple log calls
 */
export function createLogger(baseContext: ErrorContext) {
  return {
    error: (error: Error | unknown, additionalContext?: ErrorContext) =>
      logError(error, { ...baseContext, ...additionalContext }),
    warn: (message: string, additionalContext?: ErrorContext) =>
      logWarning(message, { ...baseContext, ...additionalContext }),
    info: (message: string, additionalContext?: ErrorContext) =>
      logInfo(message, { ...baseContext, ...additionalContext }),
  }
}

/**
 * Wrapper for API route error handling
 * Use this in API routes to consistently handle and log errors
 */
export async function handleApiError(
  error: Error | unknown,
  context: ErrorContext = {}
): Promise<{ message: string; statusCode: number }> {
  await logError(error, { ...context, action: 'api_request' })

  // Determine appropriate error message and status code
  const errorObj = error instanceof Error ? error : new Error(String(error))

  // Check for known error types
  if (errorObj.message.includes('Unauthorized') || errorObj.message.includes('unautorisert')) {
    return { message: 'Ikke autorisert', statusCode: 401 }
  }

  if (errorObj.message.includes('Not found') || errorObj.message.includes('ikke funnet')) {
    return { message: 'Ressurs ikke funnet', statusCode: 404 }
  }

  if (errorObj.message.includes('Rate limit') || errorObj.message.includes('for mange foresporsler')) {
    return { message: 'For mange foresporsler, prov igjen senere', statusCode: 429 }
  }

  // Default to internal server error
  return { message: 'En uventet feil oppstod', statusCode: 500 }
}

/**
 * Track error boundary captures
 */
export function logErrorBoundary(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName?: string
): void {
  logError(error, {
    componentName: componentName || 'ErrorBoundary',
    additionalData: {
      componentStack: errorInfo.componentStack,
    },
  })
}

