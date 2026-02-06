'use client'

import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Appearance } from '@stripe/stripe-js'
import PaymentForm from './PaymentForm'
import { Loader2, Sparkles, Check, Clock, Shield, AlertCircle, RefreshCw, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { PRICING } from '@/lib/pricing'

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface StripeCheckoutProps {
  onSuccess: () => void
  onCancel: () => void
}

interface ApiError {
  error: string
  errorCode?: string
  recoverable?: boolean
  suggestion?: string
  retryAfter?: number
}

export default function StripeCheckout({ onSuccess, onCancel }: StripeCheckoutProps) {
  const { user } = useAuth()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  const createSubscription = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60
          setRetryCountdown(retryAfter)

          // Start countdown
          const interval = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(interval)
                return null
              }
              return prev - 1
            })
          }, 1000)
        }

        throw {
          error: data.error || 'Kunne ikke starte betaling',
          errorCode: data.errorCode,
          recoverable: data.recoverable ?? true,
          suggestion: data.suggestion,
          retryAfter: data.retryAfter,
        }
      }

      setClientSecret(data.clientSecret)
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: err instanceof Error ? err.message : 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    createSubscription()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Stripe Elements appearance matching Botsy design
  const appearance: Appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#bad532',
      colorBackground: '#1A243E',
      colorText: '#FFFFFF',
      colorTextSecondary: '#6B7A94',
      colorDanger: '#EF4444',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: 'none',
        padding: '12px 16px',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      },
      '.Input:focus': {
        border: '1px solid rgba(186, 213, 50, 0.5)',
        boxShadow: '0 0 0 3px rgba(186, 213, 50, 0.1)',
      },
      '.Input:hover': {
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
      '.Input--invalid': {
        border: '1px solid rgba(239, 68, 68, 0.5)',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
      },
      '.Label': {
        color: '#A8B4C8',
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '8px',
      },
      '.Tab': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        color: '#A8B4C8',
        transition: 'all 0.2s ease',
      },
      '.Tab:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
      '.Tab--selected': {
        backgroundColor: 'rgba(186, 213, 50, 0.1)',
        border: '1px solid #bad532',
        color: '#bad532',
      },
      '.TabIcon--selected': {
        fill: '#bad532',
      },
      '.Error': {
        color: '#EF4444',
        fontSize: '14px',
        marginTop: '8px',
      },
      '.CheckboxInput': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
      '.CheckboxInput--checked': {
        backgroundColor: '#bad532',
        borderColor: '#bad532',
      },
    },
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-botsy-lime/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-10 w-10 animate-spin text-botsy-lime relative" />
        </div>
        <p className="text-[#A8B4C8] mt-4 font-medium">Forbereder sikker betaling...</p>
        <p className="text-[#6B7A94] text-sm mt-1">Dette tar bare et øyeblikk</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            {error.errorCode && (
              <p className="text-red-400 font-medium text-sm mb-1">{error.errorCode}</p>
            )}
            <p className="text-red-400">{error.error}</p>
            {error.suggestion && (
              <p className="text-red-400/70 text-sm mt-1">{error.suggestion}</p>
            )}
            {retryCountdown !== null && (
              <p className="text-red-400/70 text-sm mt-2">
                Kan prøve igjen om {retryCountdown} sekunder
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Tilbake
          </Button>
          {error.recoverable && (
            <Button
              onClick={createSubscription}
              disabled={retryCountdown !== null && retryCountdown > 0}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Prøv igjen
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center animate-fade-in">
        <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
        <p className="text-yellow-400 font-medium">Kunne ikke laste betalingsskjema</p>
        <p className="text-yellow-400/70 text-sm mt-1">Vennligst prøv igjen</p>
        <Button
          variant="outline"
          onClick={onCancel}
          className="mt-4"
        >
          Tilbake
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Plan Summary */}
      <div className="bg-gradient-to-br from-botsy-lime/10 via-botsy-lime/5 to-transparent border border-botsy-lime/20 rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-botsy-lime/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="flex items-center gap-3 mb-4 relative">
          <div className="h-12 w-12 rounded-xl bg-botsy-lime/20 flex items-center justify-center shadow-lg shadow-botsy-lime/10">
            <Sparkles className="h-6 w-6 text-botsy-lime" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Botsy Standard</h3>
            <p className="text-[#6B7A94] text-sm">Alt du trenger for kundeservice</p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-white">{PRICING.monthlyFormatted}</span>
          <span className="text-[#6B7A94]">/måned</span>
          <span className="ml-2 text-[#6B7A94] line-through text-sm">{PRICING.originalMonthly} kr</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { icon: Zap, text: 'Ubegrenset meldinger' },
            { icon: Check, text: 'Alle kanaler' },
            { icon: Check, text: '20 teammedlemmer' },
            { icon: Sparkles, text: 'AI-drevet chatbot' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-[#A8B4C8]">
              <Icon className="h-4 w-4 text-botsy-lime flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <Clock className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-blue-400 text-sm font-medium">14 dagers gratis prøveperiode</p>
            <p className="text-blue-400/70 text-xs">Du belastes ikke før prøveperioden er over</p>
          </div>
        </div>
      </div>

      {/* Stripe Elements Payment Form */}
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance,
          locale: 'nb',
        }}
      >
        <PaymentForm onSuccess={onSuccess} onCancel={onCancel} clientSecret={clientSecret} />
      </Elements>

      {/* Terms & Withdrawal Info */}
      <p className="text-[#6B7A94] text-xs text-center leading-relaxed">
        Ved å starte abonnementet godtar du{' '}
        <a href="/vilkar" target="_blank" className="text-botsy-lime hover:underline">vilkårene</a>
        {' '}og{' '}
        <a href="/personvern" target="_blank" className="text-botsy-lime hover:underline">personvernerklæringen</a>.
        Du har 14 dagers angrerett etter kjøp, jf.{' '}
        <a href="/vilkar#angrerett" target="_blank" className="text-botsy-lime hover:underline">angrerettloven</a>.
      </p>

      {/* Security Badges */}
      <div className="flex items-center justify-center gap-6 py-2">
        <div className="flex items-center gap-1.5 text-[#6B7A94] text-xs">
          <Shield className="h-4 w-4" />
          <span>SSL-kryptert</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 text-[#6B7A94] text-xs">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>PCI-sertifisert</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 text-[#6B7A94] text-xs">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          <span>Stripe-sikret</span>
        </div>
      </div>
    </div>
  )
}
