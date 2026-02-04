'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Stripe
const StripeCheckout = dynamic(() => import('@/components/stripe/StripeCheckout'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-botsy-lime" />
    </div>
  ),
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
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get user initials
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  // Check for success/cancel from checkout
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessMessage(true)
      // Clear URL params
      window.history.replaceState({}, '', '/admin/fakturering')
    }
  }, [searchParams])

  // Fetch subscription data
  useEffect(() => {
    async function fetchSubscription() {
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
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [user])

  // Show embedded checkout form
  const handleStartSubscription = () => {
    setShowCheckoutForm(true)
    setError(null)
  }

  // Handle successful payment
  const handleCheckoutSuccess = () => {
    setShowCheckoutForm(false)
    setShowSuccessMessage(true)
    // Refresh subscription data
    window.location.reload()
  }

  // Handle checkout cancel
  const handleCheckoutCancel = () => {
    setShowCheckoutForm(false)
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
        throw new Error(data.error || 'Kunne ikke åpne kundeportal')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
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
        throw new Error(data.error || 'Kunne ikke kansellere abonnement')
      }

      // Refresh subscription data
      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
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
        throw new Error(data.error || 'Kunne ikke gjenoppta abonnement')
      }

      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: false } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setActionLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-400">Aktivt</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-400">Prøveperiode</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-500/10 text-yellow-400">Forfalt</Badge>
      case 'canceled':
        return <Badge className="bg-red-500/10 text-red-400">Kansellert</Badge>
      default:
        return <Badge className="bg-[#6B7A94]/10 text-[#6B7A94]">Ingen</Badge>
    }
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-botsy-dark-deep/50">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#6B7A94] hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={100}
              height={32}
              className="h-8 w-auto"
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
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Fakturering</h1>
          <p className="text-[#6B7A94]">Administrer abonnement og betalinger</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <p className="text-green-400">Abonnementet ditt er nå aktivt! Velkommen til Botsy.</p>
            </div>
            <button onClick={() => setShowSuccessMessage(false)}>
              <X className="h-5 w-5 text-green-400/60 hover:text-green-400" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
            <button onClick={() => setError(null)}>
              <X className="h-5 w-5 text-red-400/60 hover:text-red-400" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-botsy-lime" />
          </div>
        ) : !isActive ? (
          /* No Subscription - Show CTA or Checkout Form */
          showCheckoutForm ? (
            /* Embedded Stripe Checkout */
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-botsy-lime/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative max-w-lg mx-auto">
                <StripeCheckout
                  onSuccess={handleCheckoutSuccess}
                  onCancel={handleCheckoutCancel}
                />
              </div>
            </Card>
          ) : (
            /* Subscription CTA */
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-botsy-lime/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative text-center max-w-lg mx-auto">
                <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-8 w-8 text-botsy-lime" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Start ditt Botsy-abonnement</h2>
                <p className="text-[#A8B4C8] mb-6">
                  Få tilgang til alle funksjoner med 14 dagers gratis prøveperiode.
                  Ingen binding, kanseller når som helst.
                </p>

                <div className="bg-white/[0.02] rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-[#6B7A94] line-through text-lg">1499 kr</span>
                    <span className="text-4xl font-bold text-white">699 kr</span>
                    <span className="text-[#6B7A94]">/mnd</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      'Ubegrenset meldinger',
                      'Alle kanaler inkludert',
                      'Opptil 10 teammedlemmer',
                      'Ubegrenset FAQs',
                      'AI-drevet chatbot',
                      'Analyser og innsikt',
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-[#A8B4C8]">
                        <Check className="h-4 w-4 text-botsy-lime flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleStartSubscription}
                  disabled={actionLoading}
                  className="w-full h-12 text-base"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Start 14 dagers gratis prøveperiode
                    </>
                  )}
                </Button>
                <p className="text-[#6B7A94] text-sm mt-3">
                  Du belastes ikke før prøveperioden er over
                </p>
              </div>
            </Card>
          )
        ) : (
          <>
            {/* Current Plan */}
            <Card className="p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-botsy-lime/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    {getStatusBadge(subscription?.status)}
                    <h2 className="text-3xl font-bold text-white mb-1 mt-2">
                      699 kr<span className="text-lg text-[#6B7A94] font-normal">/mnd</span>
                    </h2>
                    <p className="text-[#6B7A94]">Faktureres månedlig</p>
                  </div>
                  <div className="text-right">
                    {subscription?.status === 'trialing' && subscription.trialEnd && (
                      <p className="text-blue-400 text-sm flex items-center gap-1 justify-end mb-1">
                        <Clock className="h-4 w-4" />
                        Prøveperiode til {formatDate(subscription.trialEnd)}
                      </p>
                    )}
                    {subscription?.cancelAtPeriodEnd ? (
                      <p className="text-yellow-400 text-sm flex items-center gap-1 justify-end mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        Kanselleres {formatDate(subscription?.currentPeriodEnd)}
                      </p>
                    ) : subscription?.currentPeriodEnd && (
                      <p className="text-[#6B7A94] text-sm">
                        Neste faktura: {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Meldinger', value: 'Ubegrenset' },
                    { label: 'Kanaler', value: 'Alle' },
                    { label: 'Teammedlemmer', value: 'Opptil 10' },
                    { label: 'FAQs', value: 'Ubegrenset' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-white/[0.02] rounded-xl">
                      <p className="text-white font-medium">{item.value}</p>
                      <p className="text-[#6B7A94] text-sm">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPortal}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Administrer abonnement
                      </>
                    )}
                  </Button>
                  {subscription?.cancelAtPeriodEnd ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading}
                    >
                      Gjenoppta abonnement
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:border-red-400/50"
                      onClick={handleCancelSubscription}
                      disabled={actionLoading}
                    >
                      Kanseller abonnement
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Payment Method Card */}
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Betalingsmetode</h2>
              <p className="text-[#6B7A94] mb-4">
                Administrer betalingsmetode og faktureringsinformasjon i Stripe-portalen.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={actionLoading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Endre betalingsmetode
              </Button>
            </Card>

            {/* Invoice History */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Faktureringshistorikk</h2>
              </div>

              {invoices.length === 0 ? (
                <p className="text-[#6B7A94] text-center py-8">Ingen fakturaer ennå</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-[#6B7A94]" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {formatDate(invoice.createdAt)}
                          </p>
                          <p className="text-[#6B7A94] text-sm">
                            {invoice.periodStart && invoice.periodEnd
                              ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
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
                          <Badge className="bg-green-500/10 text-green-400">Betalt</Badge>
                        </div>
                        {invoice.invoicePdf && (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
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
          </>
        )}
      </div>
    </div>
  )
}
