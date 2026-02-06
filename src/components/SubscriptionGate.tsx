'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { AlertTriangle, ArrowRight, CreditCard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PRICING } from '@/lib/pricing'

interface SubscriptionGateProps {
  children: React.ReactNode
}

type SubscriptionStatus = 'checking' | 'active' | 'inactive' | 'incomplete' | 'error'

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
          // Fail closed - deny access if we can't verify subscription
          setStatus('inactive')
          setShowOverlay(true)
          return
        }

        const data = await response.json()
        const subscriptionStatus = data.subscription?.status

        // Active statuses: 'active', 'trialing'
        if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
          setStatus('active')
        } else if (subscriptionStatus === 'incomplete' || subscriptionStatus === null) {
          // User registered but never completed onboarding/payment
          setStatus('incomplete')
          setShowOverlay(true)
        } else {
          // Expired, canceled, past_due, unpaid, incomplete_expired, paused
          setStatus('inactive')
          setShowOverlay(true)
        }
      } catch (error) {
        console.error('Failed to check subscription:', error)
        // Fail closed - deny access if check fails
        setStatus('inactive')
        setShowOverlay(true)
      }
    }

    checkSubscription()
  }, [user])

  // Show loading spinner while checking subscription
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-botsy-dark">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-botsy-lime/30 border-t-botsy-lime rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6B7A94] text-sm">Laster...</p>
        </div>
      </div>
    )
  }

  // Redirect to onboarding for users who never completed payment
  if (status === 'incomplete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-botsy-dark p-4">
        <div className="w-full max-w-lg">
          <Card className="p-8 text-center border-botsy-lime/20 shadow-2xl shadow-botsy-lime/5">
            <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-6">
              <CreditCard className="h-8 w-8 text-botsy-lime" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Fullfør oppsettet
            </h1>

            <p className="text-[#A8B4C8] mb-6">
              Du har ikke fullført registreringen ennå. Fullfør oppsett og
              start din {PRICING.trialDays} dagers gratis prøveperiode.
            </p>

            <Link href="/onboarding">
              <Button className="w-full h-12 text-base mb-4">
                <ArrowRight className="h-5 w-5 mr-2" />
                Fullfør oppsett
              </Button>
            </Link>

            <p className="text-[#6B7A94] text-sm">
              {PRICING.trialDays} dager gratis · {PRICING.monthlyWithPeriod} etterpå · Ingen binding
            </p>
          </Card>
        </div>
      </div>
    )
  }

  // Block access completely when subscription is inactive
  if (status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-botsy-dark p-4">
        <div className="w-full max-w-lg">
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
                  {PRICING.monthlyWithPeriod} · Ingen binding · Kanseller når som helst
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
    )
  }

  return (
    <>
      {children}

      {/* Fallback overlay in case status changes after render */}
      {showOverlay && (
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
                    {PRICING.monthlyWithPeriod} • Ingen binding • Kanseller når som helst
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
