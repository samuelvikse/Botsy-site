'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Users, Clock, ArrowRight, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface PendingInvitation {
  id: string
  companyName: string
  role: string
  invitedBy: string
  expiresAt: Date
}

interface WelcomeViewProps {
  userEmail: string
  userName: string
}

export function WelcomeView({ userEmail, userName }: WelcomeViewProps) {
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch pending invitations for this user's email
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!userEmail || !db) {
        setIsLoading(false)
        return
      }

      try {
        // Query all companies for invitations matching this email
        const invitationsRef = collection(db, 'invitations')
        const q = query(
          invitationsRef,
          where('email', '==', userEmail.toLowerCase()),
          where('status', '==', 'pending')
        )
        const snapshot = await getDocs(q)

        const invitations: PendingInvitation[] = []
        for (const doc of snapshot.docs) {
          const data = doc.data()
          const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)

          // Only include non-expired invitations
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
        setIsLoading(false)
      }
    }

    fetchInvitations()
  }, [userEmail])

  const firstName = userName?.split(' ')[0] || 'der'

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Welcome Header */}
        <div className="text-center mb-10">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-botsy-lime/20 to-botsy-lime/5 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-botsy-lime" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Velkommen, {firstName}!
          </h1>
          <p className="text-[#A8B4C8] text-lg">
            La oss komme i gang med Botsy
          </p>
        </div>

        {/* Main CTA - Start Trial */}
        <Card className="p-8 mb-6 border-botsy-lime/20 bg-gradient-to-br from-botsy-lime/5 to-transparent">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold text-white mb-2">
                Start din gratis prøveperiode
              </h2>
              <p className="text-[#A8B4C8] mb-4">
                14 dager gratis. Ingen kredittkort nødvendig. Sett opp din AI-assistent på under 5 minutter.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Ubegrenset meldinger',
                  'Alle kanaler inkludert',
                  'Norsk AI som forstår kontekst',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-[#A8B4C8] text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-botsy-lime" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0">
              <Link href="/onboarding">
                <Button size="xl" className="shadow-lg shadow-botsy-lime/20">
                  Prøv gratis
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Pending Invitations */}
        {isLoading ? (
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
                    ? 'Du er invitert til et team'
                    : `Du er invitert til ${pendingInvitations.length} team`}
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
                <h3 className="text-white font-medium">Venter du på en invitasjon?</h3>
                <p className="text-[#6B7A94] text-sm">
                  Hvis du er invitert til et eksisterende team, vil invitasjonen vises her når den ankommer.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Help Text */}
        <p className="text-center text-[#6B7A94] text-sm mt-8">
          Har du spørsmål?{' '}
          <Link href="/kontakt" className="text-botsy-lime hover:underline">
            Kontakt oss
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
