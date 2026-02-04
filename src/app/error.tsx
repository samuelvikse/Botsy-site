'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/error-logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * App Router Error Handler
 *
 * This component handles errors in the app router and provides
 * a user-friendly error UI matching the Botsy dark theme.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error when component mounts
    logError(error, {
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      action: 'page_error',
      additionalData: {
        digest: error.digest,
      },
    })
  }, [error])

  return (
    <div className="min-h-screen bg-botsy-dark flex items-center justify-center p-6">
      <div className="glass-dark rounded-botsy-xl p-8 md:p-12 max-w-lg w-full text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-error/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
          Noe gikk galt
        </h1>

        <p className="text-botsy-text-secondary text-lg mb-8">
          En uventet feil oppstod. Vi jobber med a fikse problemet.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-botsy-dark-deep rounded-botsy text-left border border-error/20">
            <p className="text-error text-sm font-mono break-all mb-2">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-botsy-text-muted text-xs font-mono">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-8 py-4 bg-botsy-dark-surface text-white rounded-botsy border border-white/10 hover:border-botsy-lime/30 transition-all duration-300 font-medium"
          >
            Prov igjen
          </button>
          <a
            href="/"
            className="px-8 py-4 bg-botsy-lime text-botsy-dark font-semibold rounded-botsy hover:bg-botsy-lime-light transition-all duration-300 shadow-lime-glow-sm hover:shadow-lime-glow inline-flex items-center justify-center"
          >
            Ga til forsiden
          </a>
        </div>

        {/* Support Link */}
        <p className="mt-8 text-botsy-text-muted text-sm">
          Fortsetter problemet?{' '}
          <a
            href="/kontakt"
            className="text-botsy-lime hover:text-botsy-lime-light transition-colors underline underline-offset-2"
          >
            Kontakt oss
          </a>
        </p>
      </div>
    </div>
  )
}
