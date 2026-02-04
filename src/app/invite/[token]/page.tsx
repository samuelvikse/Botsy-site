'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Loader2, UserPlus, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

interface InvitationDetails {
  id: string
  companyId: string
  email: string
  role: 'admin' | 'employee'
  inviterName: string
  companyName: string
  expiresAt: string
}

type PageStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'error'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const token = params.token as string

  const [status, setStatus] = useState<PageStatus>('loading')
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setStatus('invalid')
        return
      }

      try {
        const response = await fetch(`/api/invitations/${token}`)

        if (response.status === 404) {
          setStatus('invalid')
          setError('Invitasjonen finnes ikke')
          return
        }

        if (response.status === 410) {
          const data = await response.json()
          if (data.error?.includes('utløpt')) {
            setStatus('expired')
          } else {
            setStatus('invalid')
          }
          setError(data.error)
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch invitation')
        }

        const data = await response.json()
        setInvitation(data.invitation)
        setStatus('valid')
      } catch {
        setStatus('error')
        setError('Kunne ikke laste invitasjonen')
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!user || !invitation) return

    setIsAccepting(true)
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invitation')
      }

      setStatus('accepted')

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/admin')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke akseptere invitasjonen')
      setStatus('error')
    } finally {
      setIsAccepting(false)
    }
  }

  const getRoleInfo = (role: string) => {
    if (role === 'admin') {
      return {
        icon: <Shield className="h-6 w-6 text-blue-400" />,
        name: 'Administrator',
        description: 'Full tilgang til dashboard unntatt innstillinger',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
      }
    }
    return {
      icon: <User className="h-6 w-6 text-gray-400" />,
      name: 'Ansatt',
      description: 'Begrenset tilgang basert på tildelte rettigheter',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    }
  }

  // Loading state
  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-botsy-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-botsy-lime animate-spin mx-auto mb-4" />
          <p className="text-[#6B7A94]">Laster invitasjon...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-botsy-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={120}
              height={40}
              className="mx-auto"
            />
          </Link>
        </div>

        {/* Invalid/Expired States */}
        {(status === 'invalid' || status === 'expired') && (
          <Card className="p-8 text-center">
            <div className={`mx-auto h-16 w-16 rounded-full ${status === 'expired' ? 'bg-orange-500/10' : 'bg-red-500/10'} flex items-center justify-center mb-6`}>
              {status === 'expired' ? (
                <Clock className="h-8 w-8 text-orange-400" />
              ) : (
                <XCircle className="h-8 w-8 text-red-400" />
              )}
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {status === 'expired' ? 'Invitasjonen har utløpt' : 'Ugyldig invitasjon'}
            </h1>
            <p className="text-[#6B7A94] mb-6">
              {error || (status === 'expired'
                ? 'Denne invitasjonen er ikke lenger gyldig. Be om en ny invitasjon.'
                : 'Invitasjonslenken er ugyldig eller har allerede blitt brukt.')}
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Gå til forsiden
              </Button>
            </Link>
          </Card>
        )}

        {/* Error State */}
        {status === 'error' && (
          <Card className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Noe gikk galt</h1>
            <p className="text-[#6B7A94] mb-6">{error || 'En feil oppstod. Prøv igjen senere.'}</p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Gå til forsiden
              </Button>
            </Link>
          </Card>
        )}

        {/* Accepted State */}
        {status === 'accepted' && (
          <Card className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Velkommen til teamet!</h1>
            <p className="text-[#6B7A94] mb-6">
              Du er nå medlem av {invitation?.companyName || 'bedriften'}. Du blir snart videresendt...
            </p>
            <Loader2 className="h-5 w-5 text-botsy-lime animate-spin mx-auto" />
          </Card>
        )}

        {/* Valid Invitation */}
        {status === 'valid' && invitation && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-botsy-lime/10 flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-botsy-lime" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Du er invitert!</h1>
              <p className="text-[#6B7A94]">
                {invitation.inviterName} har invitert deg til å bli med i{' '}
                <span className="text-white font-medium">{invitation.companyName || 'deres bedrift'}</span>
              </p>
            </div>

            {/* Role Info */}
            {(() => {
              const roleInfo = getRoleInfo(invitation.role)
              return (
                <div className={`${roleInfo.bgColor} rounded-xl p-4 mb-6`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full ${roleInfo.bgColor} flex items-center justify-center`}>
                      {roleInfo.icon}
                    </div>
                    <div>
                      <p className={`font-medium ${roleInfo.color}`}>{roleInfo.name}</p>
                      <p className="text-[#6B7A94] text-sm">{roleInfo.description}</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Action Buttons */}
            {user ? (
              <div className="space-y-3">
                {user.email?.toLowerCase() === invitation.email.toLowerCase() ? (
                  <Button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Aksepterer...
                      </>
                    ) : (
                      'Aksepter invitasjon'
                    )}
                  </Button>
                ) : (
                  <>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                      <p className="text-orange-400 text-sm">
                        Denne invitasjonen er sendt til {invitation.email}. Du er logget inn som {user.email}.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/logg-inn')} className="w-full">
                      Logg inn med riktig konto
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[#6B7A94] text-sm text-center">
                  Logg inn eller opprett en konto for å akseptere invitasjonen.
                </p>
                <Link href={`/logg-inn?redirect=/invite/${token}`}>
                  <Button className="w-full">Logg inn</Button>
                </Link>
                <Link href={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}>
                  <Button variant="outline" className="w-full">Opprett konto</Button>
                </Link>
              </div>
            )}

            {/* Expiry Notice */}
            <p className="text-[#6B7A94] text-xs text-center mt-4">
              Invitasjonen utløper{' '}
              {new Date(invitation.expiresAt).toLocaleDateString('nb-NO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
