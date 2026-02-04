'use client'

import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Appearance } from '@stripe/stripe-js'
import PaymentForm from './PaymentForm'
import { Loader2, Sparkles, Check, Clock, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface StripeCheckoutProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function StripeCheckout({ onSuccess, onCancel }: StripeCheckoutProps) {
  const { user } = useAuth()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createSubscription() {
      if (!user) return

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
          throw new Error(data.error || 'Kunne ikke starte betaling')
        }

        setClientSecret(data.clientSecret)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Noe gikk galt')
      } finally {
        setLoading(false)
      }
    }

    createSubscription()
  }, [user])

  // Stripe Elements appearance matching Botsy design
  const appearance: Appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#CDFF4D',
      colorBackground: '#0D1117',
      colorText: '#FFFFFF',
      colorTextSecondary: '#6B7A94',
      colorDanger: '#EF4444',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: 'none',
        padding: '12px 16px',
      },
      '.Input:focus': {
        border: '1px solid rgba(205, 255, 77, 0.5)',
        boxShadow: '0 0 0 1px rgba(205, 255, 77, 0.2)',
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
      },
      '.Tab:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#FFFFFF',
      },
      '.Tab--selected': {
        backgroundColor: 'rgba(205, 255, 77, 0.1)',
        border: '1px solid #CDFF4D',
        color: '#CDFF4D',
      },
      '.TabIcon--selected': {
        fill: '#CDFF4D',
      },
      '.Error': {
        color: '#EF4444',
        fontSize: '14px',
      },
    },
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-botsy-lime mb-4" />
        <p className="text-[#6B7A94]">Forbereder betaling...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="text-[#6B7A94] hover:text-white transition-colors"
        >
          Tilbake
        </button>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center">
        <p className="text-yellow-400">Kunne ikke laste betalingsskjema</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-gradient-to-br from-botsy-lime/10 to-transparent border border-botsy-lime/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-botsy-lime/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-botsy-lime" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Botsy Standard</h3>
            <p className="text-[#6B7A94] text-sm">Alt du trenger for kundeservice</p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-white">699 kr</span>
          <span className="text-[#6B7A94]">/måned</span>
        </div>

        <div className="space-y-2 mb-4">
          {[
            'Ubegrenset meldinger',
            'Alle kanaler inkludert',
            'Opptil 10 teammedlemmer',
            'AI-drevet chatbot',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-[#A8B4C8]">
              <Check className="h-4 w-4 text-botsy-lime flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <Clock className="h-5 w-5 text-blue-400" />
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

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-[#6B7A94] text-xs">
        <Shield className="h-4 w-4" />
        <span>Sikker betaling med SSL-kryptering</span>
      </div>
    </div>
  )
}
