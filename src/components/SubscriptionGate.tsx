'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { AlertTriangle, CreditCard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SubscriptionGateProps {
  children: React.ReactNode
}

type SubscriptionStatus = 'checking' | 'active' | 'inactive' | 'error'

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuth()
  const { isOwner } = usePermissions()
  const [status, setStatus] = useState<SubscriptionStatus>('checking')
  const [showOverlay, setShowOverlay] = useState(false)

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
          setShowOverlay(true)
        }
      } catch (error) {
        console.error('Failed to check subscription:', error)
        // Fail open - allow access if check fails
        setStatus('active')
      }
    }

    checkSubscription()
  }, [user])

  // Always render children immediately - no blocking loading state
  return (
    <>
      {children}

      {/* Subscription expired overlay - shown after background check */}
      {status === 'inactive' && showOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {}} // Prevent closing by clicking backdrop
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <Card className="p-8 text-center border-yellow-500/20 shadow-2xl shadow-yellow-500/5">
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
          </div>
        </div>
      )}
    </>
  )
}
