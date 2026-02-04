'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SubscriptionGateProps {
  children: React.ReactNode
}

type SubscriptionStatus = 'loading' | 'active' | 'inactive' | 'error'

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuth()
  const { isOwner } = usePermissions()
  const router = useRouter()
  const [status, setStatus] = useState<SubscriptionStatus>('loading')

  useEffect(() => {
    async function checkSubscription() {
      if (!user) return

      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/stripe/subscription', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          // If API fails, allow access (fail open for better UX)
          setStatus('active')
          return
        }

        const data = await response.json()
        const subscriptionStatus = data.subscription?.status

        // Active statuses: 'active', 'trialing'
        // Inactive statuses: null, 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'
        if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
          setStatus('active')
        } else {
          setStatus('inactive')
        }
      } catch (error) {
        console.error('Failed to check subscription:', error)
        // Fail open - allow access if check fails
        setStatus('active')
      }
    }

    checkSubscription()
  }, [user])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-botsy-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-botsy-lime" />
          <p className="text-[#6B7A94] text-sm">Sjekker abonnement...</p>
        </div>
      </div>
    )
  }

  // Active subscription - render children
  if (status === 'active') {
    return <>{children}</>
  }

  // Inactive subscription - show paywall
  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-botsy-dark-deep/50">
        <div className="max-w-4xl mx-auto h-16 flex items-center justify-between px-4">
          <Image
            src="/brand/botsy-full-logo.svg"
            alt="Botsy"
            width={100}
            height={32}
            className="h-7 w-auto"
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto py-16 px-4">
        <Card className="p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Abonnementet ditt har utløpt
          </h1>

          {isOwner ? (
            <>
              <p className="text-[#A8B4C8] mb-6">
                Prøveperioden din er over. For å fortsette å bruke Botsy,
                vennligst aktiver abonnementet ditt.
              </p>

              <Link href="/admin/fakturering">
                <Button className="w-full h-12 text-base mb-4">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Gå til fakturering
                </Button>
              </Link>

              <p className="text-[#6B7A94] text-sm">
                699 kr/mnd • Ingen binding • Kanseller når som helst
              </p>
            </>
          ) : (
            <>
              <p className="text-[#A8B4C8] mb-6">
                Bedriftens abonnement har utløpt. Kontakt eieren av kontoen
                for å reaktivere tilgangen.
              </p>

              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <p className="text-[#6B7A94] text-sm">
                  Du er logget inn som ansatt. Kun kontoeieren kan administrere abonnementet.
                </p>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
