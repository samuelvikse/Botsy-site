'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import {
  CreditCard,
  Download,
  Check,
  ArrowLeft,
  Receipt,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  )
}

function BillingContent() {
  const [paymentMethod, setPaymentMethod] = useState('card')
  const { user } = useAuth()

  // Get user initials
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  const invoices = [
    { id: 'INV-2026-001', date: '2026-01-01', amount: 599, status: 'paid' },
    { id: 'INV-2025-012', date: '2025-12-01', amount: 599, status: 'paid' },
    { id: 'INV-2025-011', date: '2025-11-01', amount: 599, status: 'paid' },
    { id: 'INV-2025-010', date: '2025-10-01', amount: 599, status: 'paid' },
  ]

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

        {/* Current Plan */}
        <Card className="p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-botsy-lime/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <Badge className="mb-2">STANDARD</Badge>
                <h2 className="text-3xl font-bold text-white mb-1">599 kr<span className="text-lg text-[#6B7A94] font-normal">/mnd</span></h2>
                <p className="text-[#6B7A94]">Faktureres månedlig</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm flex items-center gap-1 justify-end mb-1">
                  <Check className="h-4 w-4" />
                  Aktivt abonnement
                </p>
                <p className="text-[#6B7A94] text-sm">Neste faktura: 1. feb 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Meldinger', value: 'Ubegrenset' },
                { label: 'Kanaler', value: 'Alle' },
                { label: 'Teammedlemmer', value: '4 av 10' },
                { label: 'FAQs', value: 'Ubegrenset' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-white/[0.02] rounded-xl">
                  <p className="text-white font-medium">{item.value}</p>
                  <p className="text-[#6B7A94] text-sm">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                Endre plan
              </Button>
              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 hover:border-red-400/50">
                Kanseller abonnement
              </Button>
            </div>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Betalingsmetode</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl border text-left transition-all ${
                paymentMethod === 'card'
                  ? 'border-botsy-lime bg-botsy-lime/10'
                  : 'border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <CreditCard className={`h-6 w-6 mb-2 ${paymentMethod === 'card' ? 'text-botsy-lime' : 'text-[#6B7A94]'}`} />
              <p className="text-white font-medium">Kort</p>
              <p className="text-[#6B7A94] text-sm">Visa, Mastercard</p>
            </button>

            <button
              onClick={() => setPaymentMethod('vipps')}
              className={`p-4 rounded-xl border text-left transition-all ${
                paymentMethod === 'vipps'
                  ? 'border-botsy-lime bg-botsy-lime/10'
                  : 'border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <div className={`h-6 w-6 mb-2 rounded flex items-center justify-center font-bold text-xs ${paymentMethod === 'vipps' ? 'bg-[#FF5B24] text-white' : 'bg-[#FF5B24]/20 text-[#FF5B24]'}`}>
                V
              </div>
              <p className="text-white font-medium">Vipps</p>
              <p className="text-[#6B7A94] text-sm">Automatisk trekk</p>
            </button>
          </div>

          {paymentMethod === 'card' && (
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">VISA</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">•••• •••• •••• 4242</p>
                    <p className="text-[#6B7A94] text-sm">Utløper 12/27</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Endre</Button>
              </div>
            </div>
          )}

          {paymentMethod === 'vipps' && (
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-[#FF5B24] rounded-lg flex items-center justify-center text-white font-bold">
                    V
                  </div>
                  <div>
                    <p className="text-white font-medium">+47 912 34 567</p>
                    <p className="text-[#6B7A94] text-sm">Vipps Recurring aktiv</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Endre</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Billing Info */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Faktureringsinformasjon</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#6B7A94] text-sm block mb-1">Bedriftsnavn</label>
              <p className="text-white">Bedriften AS</p>
            </div>
            <div>
              <label className="text-[#6B7A94] text-sm block mb-1">Org.nr</label>
              <p className="text-white">123 456 789</p>
            </div>
            <div>
              <label className="text-[#6B7A94] text-sm block mb-1">Adresse</label>
              <p className="text-white">Storgata 1, 0123 Oslo</p>
            </div>
            <div>
              <label className="text-[#6B7A94] text-sm block mb-1">E-post for faktura</label>
              <p className="text-white">faktura@bedrift.no</p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="mt-4">
            Rediger informasjon
          </Button>
        </Card>

        {/* Invoice History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Faktureringshistorikk</h2>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-[#6B7A94]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{invoice.id}</p>
                    <p className="text-[#6B7A94] text-sm">
                      {new Date(invoice.date).toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-medium">{invoice.amount} kr</p>
                    <Badge className="bg-green-500/10 text-green-400">Betalt</Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Usage Warning */}
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Du nærmer deg teamgrensen</p>
            <p className="text-yellow-400/80 text-sm">
              Du har 4 av 10 teammedlemmer. Trenger du flere? Kontakt oss for en tilpasset plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
