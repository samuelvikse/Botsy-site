'use client'

import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { getStripeErrorMessage, type StripeErrorMapping } from '@/lib/stripe-errors'

interface PaymentFormProps {
  onSuccess: () => void
  onCancel: () => void
  clientSecret?: string
}

interface PaymentError extends StripeErrorMapping {
  raw?: string
}

export default function PaymentForm({ onCancel, clientSecret }: PaymentFormProps) {
  // Note: onSuccess is not used directly as Stripe redirects on success
  const stripe = useStripe()
  const elements = useElements()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<PaymentError | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Determine if this is a setup intent (for trials) or payment intent
  const isSetupIntent = clientSecret?.startsWith('seti_')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      const errorMapping = getStripeErrorMessage(submitError)
      setError({
        ...errorMapping,
        raw: submitError.message,
      })
      setIsProcessing(false)
      return
    }

    const returnUrl = `${window.location.origin}/admin/fakturering?success=true`

    // Use appropriate confirmation method based on intent type
    if (isSetupIntent) {
      // Setup intent for trial subscriptions - collect payment method for later
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
      })

      if (confirmError) {
        const errorMapping = getStripeErrorMessage(confirmError)
        setError({
          ...errorMapping,
          raw: confirmError.message,
        })
        setIsProcessing(false)
      }
    } else {
      // Payment intent for immediate payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      })

      if (confirmError) {
        const errorMapping = getStripeErrorMessage(confirmError)
        setError({
          ...errorMapping,
          raw: confirmError.message,
        })
        setIsProcessing(false)
      }
    }
  }

  const handleRetry = () => {
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 transition-all hover:border-white/[0.1]">
        <PaymentElement
          onReady={() => setIsReady(true)}
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'NO',
                },
              },
            },
          }}
        />

        {/* Loading overlay while PaymentElement initializes */}
        {!isReady && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-botsy-lime" />
          </div>
        )}
      </div>

      {/* Error Display with Recovery Options */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm">{error.title}</p>
              <p className="text-red-400/90 text-sm mt-0.5">{error.message}</p>
              {error.suggestion && (
                <p className="text-red-400/70 text-sm mt-1">{error.suggestion}</p>
              )}
              {error.recoverable && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-red-400 hover:text-red-300 text-sm mt-2 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Prøv igjen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Information */}
      <div className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
        <ShieldCheck className="h-5 w-5 text-botsy-lime flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[#A8B4C8] text-sm">
            Sikker betaling via Stripe. Kortinformasjon lagres aldri på våre servere.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-[#6B7A94] text-xs">
              <Lock className="h-3 w-3" />
              256-bit SSL
            </div>
            <div className="flex items-center gap-1 text-[#6B7A94] text-xs">
              <ShieldCheck className="h-3 w-3" />
              PCI DSS
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Avbryt
        </Button>
        <Button
          type="submit"
          className="flex-1 group"
          disabled={!stripe || isProcessing || !isReady}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Behandler...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              Start abonnement
            </>
          )}
        </Button>
      </div>

      {/* Trial Notice */}
      {isSetupIntent && (
        <p className="text-center text-[#6B7A94] text-xs">
          Ved å trykke &quot;Start abonnement&quot; godtar du at kortet belastes 699 kr/mnd
          etter prøveperioden på 14 dager.
        </p>
      )}
    </form>
  )
}
