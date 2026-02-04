'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Zap,
  Shield,
  Users,
  MessageSquare,
  BarChart3,
  Infinity as InfinityIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            Aktivt
          </Badge>
        )
      case 'trialing':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1">
            <Clock className="h-3 w-3 mr-2" />
            Prøveperiode
          </Badge>
        )
      case 'past_due':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1">
            <AlertTriangle className="h-3 w-3 mr-2" />
            Forfalt
          </Badge>
        )
      case 'canceled':
        return (
          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1">
            Kansellert
          </Badge>
        )
      default:
        return (
          <Badge className="bg-[#6B7A94]/20 text-[#6B7A94] border border-[#6B7A94]/30 px-3 py-1">
            Ingen abonnement
          </Badge>
        )
    }
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  const features = [
    { icon: MessageSquare, label: 'Ubegrenset meldinger', value: '∞' },
    { icon: Zap, label: 'Alle kanaler', value: '5+' },
    { icon: Users, label: 'Teammedlemmer', value: '10' },
    { icon: BarChart3, label: 'Analyser', value: '✓' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a12] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Main gradient orb */}
        <motion.div
          className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(205,255,77,0.08) 0%, rgba(205,255,77,0.02) 40%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Secondary orb */}
        <motion.div
          className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(205,255,77,0.05) 0%, transparent 60%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(205,255,77,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(205,255,77,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 border-b border-white/[0.06] backdrop-blur-xl bg-[#0a0a12]/80"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#6B7A94] hover:text-white hover:bg-white/[0.06] hover:border-botsy-lime/20 transition-all duration-300"
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-botsy-lime/20 to-botsy-lime/5 border border-botsy-lime/20 flex items-center justify-center text-botsy-lime font-semibold text-sm">
              {userInitials}
            </div>
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.displayName || 'Bruker'}</p>
              <p className="text-[#6B7A94] text-xs">{user?.email}</p>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 max-w-6xl mx-auto py-12 px-6">
        {/* Page Title */}
        <motion.div
          className="mb-10"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-botsy-lime/20 to-transparent border border-botsy-lime/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-botsy-lime" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Fakturering</h1>
          </div>
          <p className="text-[#6B7A94] ml-[52px]">Administrer abonnement og betalingsmetoder</p>
        </motion.div>

        {/* Alerts */}
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 font-medium">Abonnementet er aktivert!</p>
                  <p className="text-emerald-400/70 text-sm">Velkommen til Botsy. Du har nå full tilgang.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-emerald-400/60 hover:text-emerald-400" />
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <p className="text-red-400">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-red-400/60 hover:text-red-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <motion.div
            className="flex flex-col items-center justify-center py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-botsy-lime" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-botsy-lime/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <p className="text-[#6B7A94] mt-4">Laster abonnement...</p>
          </motion.div>
        ) : !isActive ? (
          /* No Subscription - Show CTA or Checkout Form */
          <AnimatePresence mode="wait">
            {showCheckoutForm ? (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-xl p-8 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-botsy-lime/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative max-w-lg mx-auto">
                  <StripeCheckout
                    onSuccess={handleCheckoutSuccess}
                    onCancel={handleCheckoutCancel}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-2 gap-8"
              >
                {/* Pricing Card */}
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-[1px] bg-gradient-to-b from-botsy-lime/30 via-botsy-lime/10 to-transparent rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

                  <div className="relative rounded-[27px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-8 overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-botsy-lime/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <motion.div
                      className="absolute top-6 right-6 h-20 w-20 rounded-full border border-botsy-lime/20"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    >
                      <div className="absolute top-0 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-botsy-lime rounded-full" />
                    </motion.div>

                    <div className="relative">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-botsy-lime/10 border border-botsy-lime/20 mb-6">
                        <Sparkles className="h-4 w-4 text-botsy-lime" />
                        <span className="text-botsy-lime text-sm font-medium">Standard Plan</span>
                      </div>

                      {/* Pricing */}
                      <div className="mb-8">
                        <div className="flex items-baseline gap-3 mb-2">
                          <span className="text-[#6B7A94] text-xl line-through">1499 kr</span>
                          <span className="text-5xl font-bold text-white tracking-tight">699</span>
                          <span className="text-[#6B7A94] text-lg">kr/mnd</span>
                        </div>
                        <p className="text-[#6B7A94]">Spar 800 kr i måneden – begrenset tilbud</p>
                      </div>

                      {/* Features Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-8">
                        {features.map((feature, index) => (
                          <motion.div
                            key={feature.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
                          >
                            <div className="h-9 w-9 rounded-lg bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                              <feature.icon className="h-4 w-4 text-botsy-lime" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{feature.value}</p>
                              <p className="text-[#6B7A94] text-xs">{feature.label}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <motion.button
                        onClick={handleStartSubscription}
                        disabled={actionLoading}
                        className="w-full relative group/btn overflow-hidden rounded-xl h-14 bg-botsy-lime text-[#0a0a12] font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_40px_rgba(205,255,77,0.3)]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {actionLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-5 w-5" />
                              Start 14 dager gratis
                            </>
                          )}
                        </span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                        />
                      </motion.button>

                      <p className="text-center text-[#6B7A94] text-sm mt-4 flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4" />
                        Ingen belastning før prøveperioden utløper
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg mb-6">Alt du trenger for å automatisere kundeservice</h3>

                  {[
                    { title: 'AI-drevet chatbot', desc: 'Svar automatisk på kundehenvendelser 24/7 med intelligent AI', icon: Zap },
                    { title: 'Ubegrenset meldinger', desc: 'Ingen grenser på antall samtaler eller meldinger', icon: InfinityIcon },
                    { title: 'Alle kanaler inkludert', desc: 'Instagram, Messenger, SMS, E-post og Widget', icon: MessageSquare },
                    { title: 'Team-samarbeid', desc: 'Inviter opptil 10 teammedlemmer til din konto', icon: Users },
                    { title: 'Analyser og innsikt', desc: 'Detaljert statistikk over samtaler og ytelse', icon: BarChart3 },
                    { title: 'Prioritert support', desc: 'Få hjelp når du trenger det fra vårt team', icon: Shield },
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
                    >
                      <div className="h-10 w-10 rounded-xl bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-5 w-5 text-botsy-lime" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{item.title}</p>
                        <p className="text-[#6B7A94] text-sm">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Active Subscription */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Current Plan Card */}
            <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-xl p-8 overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-botsy-lime/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
                  <div>
                    <div className="mb-3">{getStatusBadge(subscription?.status)}</div>
                    <h2 className="text-4xl font-bold text-white tracking-tight mb-1">
                      699 kr
                      <span className="text-lg text-[#6B7A94] font-normal ml-2">/måned</span>
                    </h2>
                    <p className="text-[#6B7A94]">Botsy Standard • Faktureres månedlig</p>
                  </div>

                  <div className="lg:text-right">
                    {subscription?.status === 'trialing' && subscription.trialEnd && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 text-sm">Prøveperiode til {formatDate(subscription.trialEnd)}</span>
                      </div>
                    )}
                    {subscription?.cancelAtPeriodEnd ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="text-amber-400 text-sm">Utløper {formatDate(subscription?.currentPeriodEnd)}</span>
                      </div>
                    ) : subscription?.currentPeriodEnd && (
                      <p className="text-[#6B7A94] text-sm">
                        Neste faktura: {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handleOpenPortal}
                    disabled={actionLoading}
                    className="border-white/10 hover:border-botsy-lime/30 hover:bg-botsy-lime/5"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Administrer abonnement
                      </>
                    )}
                  </Button>
                  {subscription?.cancelAtPeriodEnd ? (
                    <Button
                      variant="outline"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading}
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Gjenoppta abonnement
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleCancelSubscription}
                      disabled={actionLoading}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                    >
                      Kanseller abonnement
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#6B7A94]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Betalingsmetode</h3>
                  <p className="text-[#6B7A94] text-sm">Administrer kort og faktureringsinformasjon</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal}
                disabled={actionLoading}
                className="border-white/10 hover:border-white/20"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Endre betalingsmetode
              </Button>
            </div>

            {/* Invoice History */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-[#6B7A94]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Faktureringshistorikk</h3>
                  <p className="text-[#6B7A94] text-sm">Oversikt over tidligere betalinger</p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-[#6B7A94]/50" />
                  </div>
                  <p className="text-[#6B7A94]">Ingen fakturaer ennå</p>
                  <p className="text-[#6B7A94]/70 text-sm">Fakturaer vises her etter første betaling</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice, index) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Check className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{formatDate(invoice.createdAt)}</p>
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
                          <p className="text-white font-semibold">
                            {(invoice.amountPaid / 100).toFixed(0)} {invoice.currency.toUpperCase()}
                          </p>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Betalt
                          </Badge>
                        </div>
                        {invoice.invoicePdf && (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                          >
                            <Download className="h-5 w-5 text-[#6B7A94] hover:text-white" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
