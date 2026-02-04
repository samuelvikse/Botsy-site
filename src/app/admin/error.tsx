'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/error-logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Admin Section Error Handler
 *
 * Handles errors specifically in the admin dashboard section.
 */
export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logError(error, {
      page: 'admin',
      action: 'admin_error',
      additionalData: {
        digest: error.digest,
      },
    })
  }, [error])

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6">
      <div className="glass-dark rounded-botsy-xl p-8 md:p-10 max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-xl md:text-2xl font-display font-semibold text-white mb-3">
          Feil i adminpanelet
        </h2>

        <p className="text-botsy-text-secondary mb-6">
          Noe gikk galt ved lasting av denne siden. Prov a laste inn pa nytt.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-3 bg-botsy-dark-deep rounded-botsy text-left border border-error/20">
            <p className="text-error text-xs font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-botsy-lime text-botsy-dark font-semibold rounded-botsy hover:bg-botsy-lime-light transition-all duration-300 shadow-lime-glow-sm hover:shadow-lime-glow"
          >
            Prov igjen
          </button>
          <a
            href="/admin"
            className="w-full px-6 py-3 bg-botsy-dark-surface text-white rounded-botsy border border-white/10 hover:border-botsy-lime/30 transition-all duration-300 font-medium inline-flex items-center justify-center"
          >
            Tilbake til dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
