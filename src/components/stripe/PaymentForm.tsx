'use client'

import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'

interface PaymentFormProps {
  onSuccess: () => void
  onCancel: () => void
  clientSecret?: string
}

export default function PaymentForm({ onSuccess, onCancel, clientSecret }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError(submitError.message || 'Noe gikk galt')
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
        setError(confirmError.message || 'Kunne ikke lagre betalingsmetode')
        setIsProcessing(false)
      }
    } else {
      // Payment intent for immediate payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      })

      if (confirmError) {
        setError(confirmError.message || 'Betalingen feilet')
        setIsProcessing(false)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <PaymentElement
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
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-[#6B7A94] text-sm">
        <Lock className="h-4 w-4" />
        <span>Sikker betaling via Stripe. Kortinformasjon lagres aldri på våre servere.</span>
      </div>

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
          className="flex-1"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Behandler...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Start abonnement
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
