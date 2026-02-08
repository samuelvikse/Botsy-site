'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'
import { usePermissions } from '@/contexts/PermissionContext'
import { ArrowRight, CreditCard, AlertTriangle, Users, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PRICING } from '@/lib/pricing'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface PendingInvitation {
  id: string
  companyName: string
  role: string
  invitedBy: string
  expiresAt: Date
}

interface SubscriptionGateProps {
  children: React.ReactNode
}

type SubscriptionStatus = 'checking' | 'active' | 'inactive' | 'incomplete'

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuth()
  const { isOwner } = usePermissions()
  const router = useRouter()
  const [status, setStatus] = useState<SubscriptionStatus>('checking')
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)

  useEffect(() => {
    async function checkSubscription() {
      if (!user) return

      try {
        const response = await authFetch('/api/stripe/subscription')

        if (!response.ok) {
          setStatus('inactive')
          return
        }

        const data = await response.json()
        const subscriptionStatus = data.subscription?.status

        if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
          setStatus('active')
        } else if (subscriptionStatus === 'incomplete' || subscriptionStatus === null) {
          setStatus('incomplete')
        } else {
          setStatus('inactive')
        }
      } catch (error) {
        console.error('Failed to check subscription:', error)
        setStatus('inactive')
      }
    }

    checkSubscription()
  }, [user])

  // Redirect owners to billing page when inactive
  useEffect(() => {
    if (status === 'inactive' && isOwner) {
      router.replace('/admin/fakturering')
    }
  }, [status, isOwner, router])

  // Fetch pending invitations for employees with inactive subscription
  useEffect(() => {
    async function fetchInvitations() {
      if (status !== 'inactive' || isOwner || !user?.email || !db) return

      setLoadingInvitations(true)
      try {
        const invitationsRef = collection(db, 'invitations')
        const q = query(
          invitationsRef,
          where('email', '==', user.email.toLowerCase()),
          where('status', '==', 'pending')
        )
        const snapshot = await getDocs(q)

        const invitations: PendingInvitation[] = []
        for (const doc of snapshot.docs) {
          const data = doc.data()
          const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)

          if (expiresAt > new Date()) {
            invitations.push({
              id: doc.id,
              companyName: data.companyName || 'Ukjent bedrift',
              role: data.role || 'employee',
              invitedBy: data.invitedBy || 'Ukjent',
              expiresAt,
            })
          }
        }

        setPendingInvitations(invitations)
      } catch (error) {
        console.error('Error fetching invitations:', error)
      } finally {
        setLoadingInvitations(false)
      }
    }

    fetchInvitations()
  }, [status, isOwner, user?.email])

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

  // Inactive — Owner: show loading while redirect happens
  if (status === 'inactive' && isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-botsy-dark">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-botsy-lime/30 border-t-botsy-lime rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6B7A94] text-sm">Laster...</p>
        </div>
      </div>
    )
  }

  // Inactive — Employee: show blocking screen with invitations
  if (status === 'inactive' && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-botsy-dark p-4">
        <div className="w-full max-w-lg space-y-6">
          <Card className="p-8 text-center border-yellow-500/20 shadow-2xl shadow-yellow-500/5">
            <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Abonnementet er ikke aktivt
            </h1>

            <p className="text-[#A8B4C8] mb-6">
              Eieren av denne bedriftskontoen har ikke oppdatert betalingen for Botsy.
              Kontakt kontoeieren for å reaktivere tilgangen.
            </p>

            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <p className="text-[#6B7A94] text-sm">
                Du er logget inn som ansatt. Kun kontoeieren kan administrere abonnementet.
              </p>
            </div>
          </Card>

          {/* Pending invitations */}
          {loadingInvitations ? (
            <Card className="p-6">
              <div className="flex items-center justify-center gap-3 text-[#6B7A94]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Sjekker invitasjoner...</span>
              </div>
            </Card>
          ) : pendingInvitations.length > 0 ? (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Du har invitasjoner</h3>
                  <p className="text-[#6B7A94] text-sm">
                    {pendingInvitations.length === 1
                      ? 'Du er invitert til et annet team'
                      : `Du er invitert til ${pendingInvitations.length} andre team`}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">{invitation.companyName}</p>
                      <p className="text-[#6B7A94] text-sm">
                        Invitert som {invitation.role === 'admin' ? 'administrator' : 'ansatt'} av {invitation.invitedBy}
                      </p>
                    </div>
                    <Link href={`/invite/${invitation.id}`}>
                      <Button variant="outline" size="sm">
                        Se invitasjon
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <Mail className="h-5 w-5 text-[#6B7A94]" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Ingen andre invitasjoner</h3>
                  <p className="text-[#6B7A94] text-sm">
                    Invitasjoner til andre team vil vises her.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
