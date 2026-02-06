'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CreditCard,
  Download,
  Check,
  ArrowLeft,
  Receipt,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  X,
  Clock,
  AlertTriangle,
  Shield,
  RefreshCw,
  Pause,
  Play,
  Calendar,
  Zap,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  Smartphone,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'
import { PRICING } from '@/lib/pricing'

// Dynamic import to avoid SSR issues with Stripe
const StripeCheckout = dynamic(() => import('@/components/stripe/StripeCheckout'), {
  ssr: false,
  loading: () => <CheckoutSkeleton />,
})

interface Invoice {
  id: string
  stripeInvoiceId: string
  amountPaid: number
  currency: string
  status: string
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
}

interface SubscriptionData {
  status: string | null
  priceId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
  pausedAt?: string | null
  resumesAt?: string | null
  paymentProvider?: 'stripe' | 'vipps' | null
  vippsAgreementStatus?: string | null
}

interface ApiError {
  error: string
  errorCode?: string
  recoverable?: boolean
  suggestion?: string
}

// Skeleton Components
function BillingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Plan Card Skeleton */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="h-6 w-24 bg-white/[0.06] rounded-lg animate-pulse mb-3" />
            <div className="h-10 w-36 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-28 bg-white/[0.06] rounded animate-pulse" />
          </div>
          <div className="sm:text-right">
            <div className="h-4 w-40 bg-white/[0.06] rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-white/[0.06] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-9 w-44 bg-white/[0.06] rounded-botsy animate-pulse" />
          <div className="h-9 w-36 bg-white/[0.06] rounded-botsy animate-pulse" />
        </div>
      </Card>

      {/* Payment Method Skeleton */}
      <Card className="p-6">
        <div className="h-6 w-32 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="h-4 w-64 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="h-9 w-40 bg-white/[0.06] rounded-botsy animate-pulse" />
      </Card>

      {/* Invoice Skeleton */}
      <Card className="p-6">
        <div className="h-6 w-40 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-4 flex items-center justify-between border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white/[0.06] rounded-xl animate-pulse" />
                <div>
                  <div className="h-5 w-32 bg-white/[0.06] rounded animate-pulse mb-2" />
                  <div className="h-4 w-48 bg-white/[0.06] rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="h-5 w-20 bg-white/[0.06] rounded animate-pulse mb-2" />
                  <div className="h-5 w-16 bg-white/[0.06] rounded animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-white/[0.06] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 bg-white/[0.06] rounded-xl animate-pulse" />
          <div>
            <div className="h-5 w-28 bg-white/[0.06] rounded animate-pulse mb-2" />
            <div className="h-4 w-40 bg-white/[0.06] rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-32 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="space-y-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-4 w-36 bg-white/[0.06] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-16 bg-white/[0.06] rounded-xl animate-pulse" />
      </div>
      <div className="h-48 bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />
      <div className="flex gap-3">
        <div className="flex-1 h-11 bg-white/[0.06] rounded-botsy animate-pulse" />
        <div className="flex-1 h-11 bg-white/[0.06] rounded-botsy animate-pulse" />
      </div>
    </div>
  )
}

// Trial Warning Component
function TrialWarning({ trialEnd }: { trialEnd: string }) {
  const trialEndDate = new Date(trialEnd)
  const now = new Date()
  const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft > 7) return null

  const isUrgent = daysLeft <= 3
  const isExpiring = daysLeft <= 1

  return (
    <div
      className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
        isExpiring
          ? 'bg-red-500/10 border-red-500/30'
          : isUrgent
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
      }`}
    >
      <Clock className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
        isExpiring ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-blue-400'
      }`} />
      <div>
        <p className={`font-medium ${
          isExpiring ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-blue-400'
        }`}>
          {isExpiring
            ? 'Prøveperioden utløper i dag!'
            : daysLeft === 1
              ? 'Prøveperioden utløper i morgen'
              : `${daysLeft} dager igjen av prøveperioden`}
        </p>
        <p className={`text-sm mt-1 ${
          isExpiring ? 'text-red-400/70' : isUrgent ? 'text-yellow-400/70' : 'text-blue-400/70'
        }`}>
          {isExpiring || isUrgent
            ? 'Legg til betalingsmetode for å fortsette uten avbrudd.'
            : 'Du vil bli belastet automatisk når prøveperioden utløper.'}
        </p>
      </div>
    </div>
  )
}

// Past Due Recovery Component
function PastDueRecovery({ onUpdatePayment, onRetry, isLoading }: {
  onUpdatePayment: () => void
  onRetry: () => void
  isLoading: boolean
}) {
  return (
    <div className="mb-6 p-6 bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/30 rounded-2xl animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">Betalingen feilet</h3>
          <p className="text-[#A8B4C8] text-sm mb-4">
            Vi kunne ikke belaste betalingsmetoden din. Oppdater betalingsinformasjonen
            for å unngå at tjenesten blir suspendert.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onUpdatePayment}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Oppdater betalingsmetode
            </Button>
            <Button
              variant="outline"
              onClick={onRetry}
              disabled={isLoading}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Prøv igjen
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Error Alert Component
function ErrorAlert({ error, onDismiss, onRetry }: {
  error: ApiError
  onDismiss: () => void
  onRetry?: () => void
}) {
  return (
    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            {error.errorCode && (
              <p className="text-red-400 font-medium text-sm mb-0.5">{error.errorCode}</p>
            )}
            <p className="text-red-400">{error.error}</p>
            {error.suggestion && (
              <p className="text-red-400/70 text-sm mt-1">{error.suggestion}</p>
            )}
            {error.recoverable && onRetry && (
              <button
                onClick={onRetry}
                className="text-red-400 hover:text-red-300 text-sm mt-2 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Prøv igjen
              </button>
            )}
          </div>
        </div>
        <button onClick={onDismiss} className="text-red-400/60 hover:text-red-400 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Success Alert Component
function SuccessAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <p className="text-green-400">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-green-400/60 hover:text-green-400 transition-colors">
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

// Pause Confirmation Modal
function PauseModal({ onConfirm, onCancel, isLoading }: {
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-botsy-dark-surface border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-up">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Pause className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pause abonnement</h3>
            <p className="text-[#6B7A94] text-sm">Midlertidig stopp</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 text-[#A8B4C8] text-sm">
            <Info className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p>Abonnementet pauses i opptil 3 måneder. Du beholder alle data og innstillinger.</p>
          </div>
          <div className="flex items-start gap-3 text-[#A8B4C8] text-sm">
            <Calendar className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p>Chatboten vil ikke være tilgjengelig mens abonnementet er pauset.</p>
          </div>
          <div className="flex items-start gap-3 text-[#A8B4C8] text-sm">
            <RefreshCw className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p>Du kan gjenoppta når som helst, og tjenesten aktiveres umiddelbart.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Avbryt
          </Button>
          <Button
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause abonnement
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  )
}

function BillingContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successText, setSuccessText] = useState('Abonnementet ditt er nå aktivt! Velkommen til Botsy.')
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null)
  // Vipps state
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'vipps' | null>(null)
  const [vippsPhone, setVippsPhone] = useState('')
  const [vippsLoading, setVippsLoading] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Get user initials
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  // Check for success/cancel from checkout
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessMessage(true)
      window.history.replaceState({}, '', '/admin/fakturering')
    }
    // Check for Vipps success
    if (searchParams.get('vipps') === 'success') {
      setSuccessText('Vipps-avtale opprettet! Du vil motta en bekreftelse i Vipps-appen.')
      setShowSuccessMessage(true)
      window.history.replaceState({}, '', '/admin/fakturering')
    }
  }, [searchParams])

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/subscription', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setInvoices(data.invoices || [])
        // Store companyId for Vipps
        if (data.companyId) {
          setCompanyId(data.companyId)
        }
      } else if (response.status === 429) {
        const data = await response.json()
        setError({
          error: 'For mange forespørsler. Vennligst vent litt.',
          errorCode: 'Rate Limit',
          recoverable: true,
          suggestion: `Prøv igjen om ${data.retryAfter || 30} sekunder.`,
        })
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  // Show embedded checkout form
  const handleStartSubscription = () => {
    setShowCheckoutForm(true)
    setError(null)
  }

  // Handle successful payment
  const handleCheckoutSuccess = () => {
    setShowCheckoutForm(false)
    setShowSuccessMessage(true)
    setSuccessText('Abonnementet ditt er nå aktivt! Velkommen til Botsy.')
    window.location.reload()
  }

  // Handle checkout cancel
  const handleCheckoutCancel = () => {
    setShowCheckoutForm(false)
    setPaymentMethod(null)
    setVippsPhone('')
  }

  // Open customer portal
  const handleOpenPortal = async () => {
    if (!user) return

    setActionLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke åpne kundeportal',
          errorCode: data.errorCode,
          recoverable: data.recoverable ?? true,
          suggestion: data.suggestion,
        }
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
      setRetryAction(() => handleOpenPortal)
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel subscription
  const handleCancelSubscription = async () => {
    if (!user) return

    if (!confirm('Er du sikker på at du vil kansellere abonnementet? Du beholder tilgang ut perioden.')) {
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/subscription', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke kansellere abonnement',
          errorCode: data.errorCode,
          recoverable: data.recoverable ?? true,
          suggestion: data.suggestion,
        }
      }

      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
      setSuccessText('Abonnementet vil bli kansellert ved periodeslutt.')
      setShowSuccessMessage(true)
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Resume subscription
  const handleResumeSubscription = async () => {
    if (!user) return

    setActionLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/subscription', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke gjenoppta abonnement',
          errorCode: data.errorCode,
          recoverable: data.recoverable ?? true,
          suggestion: data.suggestion,
        }
      }

      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: false } : null)
      setSuccessText('Abonnementet er gjenopptatt!')
      setShowSuccessMessage(true)
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Pause subscription
  const handlePauseSubscription = async () => {
    if (!user) return

    setActionLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/subscription/pause', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke pause abonnement',
          errorCode: data.errorCode,
          recoverable: data.recoverable ?? true,
          suggestion: data.suggestion,
        }
      }

      setShowPauseModal(false)
      setSubscription(prev => prev ? { ...prev, pausedAt: new Date().toISOString() } : null)
      setSuccessText('Abonnementet er nå pauset.')
      setShowSuccessMessage(true)
      fetchSubscription()
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setActionLoading(false)
      setShowPauseModal(false)
    }
  }

  // Retry payment for past_due
  const handleRetryPayment = async () => {
    if (!user) return

    setActionLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/subscription/retry', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke prøve betalingen på nytt',
          errorCode: data.errorCode,
          recoverable: data.recoverable ?? true,
          suggestion: data.suggestion,
        }
      }

      setSuccessText('Betalingen er behandlet!')
      setShowSuccessMessage(true)
      fetchSubscription()
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Start Vipps checkout
  const handleVippsCheckout = async () => {
    if (!user || !companyId) return

    // Validate phone number
    const cleanPhone = vippsPhone.replace(/\s/g, '')
    if (!/^(\+47)?[4-9]\d{7}$/.test(cleanPhone)) {
      setError({
        error: 'Ugyldig norsk mobilnummer',
        suggestion: 'Nummeret må være et norsk mobilnummer (8 siffer, starter med 4-9)',
      })
      return
    }

    setVippsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vipps/create-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          companyId,
          userId: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke opprette Vipps-avtale',
          recoverable: true,
        }
      }

      // Redirect to Vipps for confirmation
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setVippsLoading(false)
    }
  }

  // Cancel Vipps subscription
  const handleCancelVipps = async () => {
    if (!user || !companyId) return

    if (!confirm('Er du sikker på at du vil kansellere Vipps-avtalen? Du beholder tilgang ut perioden.')) {
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vipps/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          error: data.error || 'Kunne ikke kansellere Vipps-avtale',
          recoverable: true,
        }
      }

      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
      setSuccessText('Vipps-avtalen vil bli kansellert ved periodeslutt.')
      setShowSuccessMessage(true)
      fetchSubscription()
    } catch (err) {
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err as ApiError)
      } else {
        setError({
          error: 'Noe gikk galt',
          recoverable: true,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Format short date
  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Aktivt
          </Badge>
        )
      case 'trialing':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 gap-1.5">
            <Clock className="h-3 w-3" />
            Prøveperiode
          </Badge>
        )
      case 'past_due':
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Forfalt
          </Badge>
        )
      case 'paused':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 gap-1.5">
            <Pause className="h-3 w-3" />
            Pauset
          </Badge>
        )
      case 'canceled':
        return (
          <Badge className="bg-[#6B7A94]/10 text-[#6B7A94] border border-[#6B7A94]/20 gap-1.5">
            <X className="h-3 w-3" />
            Kansellert
          </Badge>
        )
      default:
        return (
          <Badge className="bg-[#6B7A94]/10 text-[#6B7A94] border border-[#6B7A94]/20">
            Ingen
          </Badge>
        )
    }
  }

  // Get invoice status badge
  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
            Betalt
          </Badge>
        )
      case 'open':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs">
            Åpen
          </Badge>
        )
      case 'uncollectible':
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs">
            Feilet
          </Badge>
        )
      default:
        return (
          <Badge className="bg-[#6B7A94]/10 text-[#6B7A94] border border-[#6B7A94]/20 text-xs">
            {status}
          </Badge>
        )
    }
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isPastDue = subscription?.status === 'past_due'
  const isPaused = subscription?.status === 'paused'

  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-botsy-dark-deep/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#6B7A94] hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={100}
              height={32}
              className="h-7 w-auto"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-medium text-sm">
              {userInitials}
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.displayName || 'Bruker'}</p>
              <p className="text-[#6B7A94] text-xs">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Fakturering</h1>
          <p className="text-[#6B7A94]">Administrer abonnement og betalinger</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <SuccessAlert
            message={successText}
            onDismiss={() => setShowSuccessMessage(false)}
          />
        )}

        {/* Error Message */}
        {error && (
          <ErrorAlert
            error={error}
            onDismiss={() => {
              setError(null)
              setRetryAction(null)
            }}
            onRetry={retryAction || undefined}
          />
        )}

        {/* Past Due Recovery */}
        {isPastDue && (
          <PastDueRecovery
            onUpdatePayment={handleOpenPortal}
            onRetry={handleRetryPayment}
            isLoading={actionLoading}
          />
        )}

        {loading ? (
          <BillingSkeleton />
        ) : !isActive && !isPastDue && !isPaused ? (
          /* No Subscription - Show CTA or Checkout Form */
          showCheckoutForm ? (
            <Card className="p-8">
              <div className="max-w-lg mx-auto">
                {/* Payment Method Selection */}
                {!paymentMethod ? (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-white mb-2">Velg betalingsmetode</h2>
                      <p className="text-[#A8B4C8] text-sm">Begge metodene gir 14 dagers gratis prøveperiode</p>
                    </div>

                    {/* Card option */}
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className="w-full p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-left transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <CreditCard className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">Betal med kort</h3>
                          <p className="text-[#6B7A94] text-sm">Visa, Mastercard, American Express</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#6B7A94] group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>

                    {/* Vipps option */}
                    <button
                      onClick={() => setPaymentMethod('vipps')}
                      className="w-full p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#FF5B24]/30 rounded-xl text-left transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#FF5B24]/20 to-[#FF5B24]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Smartphone className="h-6 w-6 text-[#FF5B24]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">Betal med Vipps</h3>
                          <p className="text-[#6B7A94] text-sm">Månedlig betaling via Vipps-appen</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#6B7A94] group-hover:text-[#FF5B24] group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={handleCheckoutCancel}
                    >
                      Avbryt
                    </Button>
                  </div>
                ) : paymentMethod === 'vipps' ? (
                  /* Vipps Phone Input */
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#FF5B24]/20 to-[#FF5B24]/10 flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="h-7 w-7 text-[#FF5B24]" />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2">Betal med Vipps</h2>
                      <p className="text-[#A8B4C8] text-sm">Skriv inn telefonnummeret knyttet til din Vipps-konto</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[#A8B4C8] mb-2">
                          Mobilnummer
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-[#6B7A94]" />
                          </div>
                          <input
                            type="tel"
                            placeholder="912 34 567"
                            value={vippsPhone}
                            onChange={(e) => setVippsPhone(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] focus:outline-none focus:border-[#FF5B24]/50 focus:ring-1 focus:ring-[#FF5B24]/20 transition-all"
                          />
                        </div>
                        <p className="text-[#6B7A94] text-xs mt-2">
                          Norsk mobilnummer (8 siffer)
                        </p>
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[#A8B4C8]">Botsy Standard</span>
                          <span className="text-white font-semibold">{PRICING.monthlyWithPeriod}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#6B7A94]">Prøveperiode</span>
                          <span className="text-blue-400">14 dager gratis</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleVippsCheckout}
                        disabled={vippsLoading || !vippsPhone.trim()}
                        className="w-full h-12 bg-[#FF5B24] hover:bg-[#E5512A] text-white"
                      >
                        {vippsLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Smartphone className="h-5 w-5 mr-2" />
                            Fortsett til Vipps
                          </>
                        )}
                      </Button>

                      <div className="flex gap-3">
                        <Button
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setPaymentMethod(null)}
                          disabled={vippsLoading}
                        >
                          Tilbake
                        </Button>
                        <Button
                          variant="ghost"
                          className="flex-1"
                          onClick={handleCheckoutCancel}
                          disabled={vippsLoading}
                        >
                          Avbryt
                        </Button>
                      </div>
                    </div>

                    <p className="text-[#6B7A94] text-xs text-center">
                      Du vil bli sendt til Vipps for å godkjenne avtalen. Første betaling trekkes etter prøveperioden.
                    </p>
                  </div>
                ) : (
                  /* Card checkout via Stripe */
                  <StripeCheckout
                    onSuccess={handleCheckoutSuccess}
                    onCancel={() => setPaymentMethod(null)}
                  />
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 overflow-hidden relative">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-botsy-lime/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <div className="text-center max-w-lg mx-auto relative">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-botsy-lime/20 to-botsy-lime/5 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-botsy-lime/10">
                  <Sparkles className="h-8 w-8 text-botsy-lime" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Start ditt Botsy-abonnement</h2>
                <p className="text-[#A8B4C8] mb-6">
                  Få tilgang til alle funksjoner med 14 dagers gratis prøveperiode.
                  Ingen binding, kanseller når som helst.
                </p>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-[#6B7A94] line-through text-lg">{PRICING.originalMonthly} kr</span>
                    <span className="text-4xl font-bold text-white">{PRICING.monthlyFormatted}</span>
                    <span className="text-[#6B7A94]">/mnd</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { icon: Zap, text: 'Ubegrenset meldinger' },
                      { icon: Check, text: 'Alle kanaler inkludert' },
                      { icon: Check, text: 'Opptil 20 teammedlemmer' },
                      { icon: Check, text: 'Ubegrenset FAQs' },
                      { icon: Sparkles, text: 'AI-drevet chatbot' },
                      { icon: Check, text: 'Analyser og innsikt' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-2 text-[#A8B4C8]">
                        <Icon className="h-4 w-4 text-botsy-lime flex-shrink-0" />
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleStartSubscription}
                  disabled={actionLoading}
                  className="w-full h-12 text-base group"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Start 14 dagers gratis prøveperiode
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-[#6B7A94] text-xs">
                    <Shield className="h-3.5 w-3.5" />
                    SSL-kryptert
                  </div>
                  <div className="flex items-center gap-1.5 text-[#6B7A94] text-xs">
                    <CreditCard className="h-3.5 w-3.5" />
                    Kort eller Vipps
                  </div>
                </div>
                <p className="text-[#6B7A94] text-sm mt-3">
                  Du belastes ikke før prøveperioden er over
                </p>
              </div>
            </Card>
          )
        ) : (
          /* Active/Past Due/Paused Subscription */
          <div className="space-y-6">
            {/* Trial Warning */}
            {subscription?.status === 'trialing' && subscription.trialEnd && (
              <TrialWarning trialEnd={subscription.trialEnd} />
            )}

            {/* Current Plan */}
            <Card className="p-6 overflow-hidden relative">
              {/* Status indicator glow */}
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-botsy-lime/50 to-transparent" />
              )}
              {isPastDue && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
              )}
              {isPaused && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
              )}

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  {getStatusBadge(subscription?.status)}
                  <h2 className="text-3xl font-bold text-white mb-1 mt-3">
                    {PRICING.monthly} kr<span className="text-lg text-[#6B7A94] font-normal">/mnd</span>
                  </h2>
                  <p className="text-[#6B7A94]">Botsy Standard • Faktureres månedlig</p>
                </div>
                <div className="sm:text-right space-y-1">
                  {subscription?.status === 'trialing' && subscription.trialEnd && (
                    <p className="text-blue-400 text-sm flex items-center gap-1.5 sm:justify-end">
                      <Clock className="h-4 w-4" />
                      Prøveperiode til {formatShortDate(subscription.trialEnd)}
                    </p>
                  )}
                  {subscription?.cancelAtPeriodEnd ? (
                    <p className="text-yellow-400 text-sm flex items-center gap-1.5 sm:justify-end">
                      <AlertTriangle className="h-4 w-4" />
                      Kanselleres {formatShortDate(subscription?.currentPeriodEnd)}
                    </p>
                  ) : subscription?.currentPeriodEnd && !isPaused && (
                    <p className="text-[#6B7A94] text-sm flex items-center gap-1.5 sm:justify-end">
                      <Calendar className="h-4 w-4" />
                      Neste faktura: {formatShortDate(subscription.currentPeriodEnd)}
                    </p>
                  )}
                  {isPaused && subscription?.resumesAt && (
                    <p className="text-yellow-400 text-sm flex items-center gap-1.5 sm:justify-end">
                      <Play className="h-4 w-4" />
                      Gjenopptas {formatShortDate(subscription.resumesAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPortal}
                  disabled={actionLoading}
                  className="group"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                      Administrer abonnement
                    </>
                  )}
                </Button>

                {isPaused ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResumeSubscription}
                    disabled={actionLoading}
                    className="text-green-400 hover:text-green-300 hover:border-green-400/50"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Gjenoppta abonnement
                  </Button>
                ) : subscription?.cancelAtPeriodEnd ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResumeSubscription}
                    disabled={actionLoading}
                    className="text-green-400 hover:text-green-300 hover:border-green-400/50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gjenoppta abonnement
                  </Button>
                ) : (
                  <>
                    {subscription?.paymentProvider !== 'vipps' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-yellow-400 hover:text-yellow-300 hover:border-yellow-400/50"
                        onClick={() => setShowPauseModal(true)}
                        disabled={actionLoading}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:border-red-400/50"
                      onClick={subscription?.paymentProvider === 'vipps' ? handleCancelVipps : handleCancelSubscription}
                      disabled={actionLoading}
                    >
                      Kanseller
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Betalingsmetode</h3>
                <Shield className="h-5 w-5 text-[#6B7A94]" />
              </div>
              {subscription?.paymentProvider === 'vipps' ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-[#FF5B24]/10 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-[#FF5B24]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Vipps</p>
                      <p className="text-[#6B7A94] text-sm">Månedlig betaling via Vipps</p>
                    </div>
                  </div>
                  <p className="text-[#6B7A94] text-sm mb-4">
                    Betalingen administreres via Vipps-appen din.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[#6B7A94] mb-4">
                    Administrer betalingsmetode og faktureringsinformasjon i Stripe-portalen.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPortal}
                    disabled={actionLoading}
                    className="group"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Endre betalingsmetode
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </>
              )}
            </Card>

            {/* Invoice History */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Faktureringshistorikk</h3>
                <Receipt className="h-5 w-5 text-[#6B7A94]" />
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-6 w-6 text-[#6B7A94]" />
                  </div>
                  <p className="text-[#6B7A94]">Ingen fakturaer ennå</p>
                  <p className="text-[#6B7A94]/60 text-sm mt-1">Fakturaer vises her etter første betaling</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {invoices.map((invoice, index) => (
                    <div
                      key={invoice.id}
                      className="py-4 flex items-center justify-between group hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
                          <Receipt className="h-5 w-5 text-[#6B7A94]" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {formatShortDate(invoice.createdAt)}
                          </p>
                          <p className="text-[#6B7A94] text-sm">
                            {invoice.periodStart && invoice.periodEnd
                              ? `${formatShortDate(invoice.periodStart)} – ${formatShortDate(invoice.periodEnd)}`
                              : 'Abonnement'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {(invoice.amountPaid / 100).toFixed(0)} {invoice.currency.toUpperCase()}
                          </p>
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                        {invoice.invoicePdf && (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Pause Modal */}
      {showPauseModal && (
        <PauseModal
          onConfirm={handlePauseSubscription}
          onCancel={() => setShowPauseModal(false)}
          isLoading={actionLoading}
        />
      )}
    </div>
  )
}
