'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global Error Handler
 *
 * This component handles errors at the root level, including errors
 * in the root layout. It must include its own <html> and <body> tags
 * since it replaces the root layout when an error occurs.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to console and potentially to a service
    // Note: We can't use the error-logger here easily since this replaces the entire app
    console.error('[Botsy Global Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })

    // Send to error reporting service if configured
    const errorEndpoint = process.env.NEXT_PUBLIC_ERROR_ENDPOINT
    if (errorEndpoint) {
      fetch(errorEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'global_error',
          message: error.message,
          digest: error.digest,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        }),
      }).catch(() => {
        // Silently fail - don't want error logging to cause more errors
      })
    }
  }, [error])

  return (
    <html lang="nb">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'Inter, system-ui, sans-serif',
          backgroundColor: '#1A243E',
          color: '#FFFFFF',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(20, 28, 50, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
          }}
        >
          {/* Error Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E74C3C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Error Message */}
          <h1
            style={{
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            En kritisk feil oppstod
          </h1>

          <p
            style={{
              color: '#A8B4C8',
              fontSize: '18px',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            Beklager, noe har gatt alvorlig galt. Vi jobber med a lose problemet.
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div
              style={{
                backgroundColor: '#141C32',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '32px',
                textAlign: 'left',
                border: '1px solid rgba(231, 76, 60, 0.2)',
              }}
            >
              <p
                style={{
                  color: '#E74C3C',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '14px',
                  wordBreak: 'break-all',
                  margin: 0,
                }}
              >
                {error.message}
              </p>
              {error.digest && (
                <p
                  style={{
                    color: '#6B7A94',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: '16px 32px',
                backgroundColor: '#1E2A4A',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(186, 213, 50, 0.3)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              Prov igjen
            </button>
            <a
              href="/"
              style={{
                padding: '16px 32px',
                backgroundColor: '#bad532',
                color: '#1A243E',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(186, 213, 50, 0.25)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#c8e048'
                e.currentTarget.style.boxShadow = '0 0 40px rgba(186, 213, 50, 0.35)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#bad532'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(186, 213, 50, 0.25)'
              }}
            >
              Ga til forsiden
            </a>
          </div>

          {/* Support Link */}
          <p
            style={{
              marginTop: '32px',
              color: '#6B7A94',
              fontSize: '14px',
            }}
          >
            Trenger du hjelp?{' '}
            <a
              href="/kontakt"
              style={{
                color: '#bad532',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              Kontakt support
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}
