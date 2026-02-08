'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Loader2, Crown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { authFetch } from '@/lib/auth-fetch'

type PageStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'confirmed' | 'completed' | 'error'

export default function TransferPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const token = params.token as string
  const userType = searchParams.get('type') as 'from' | 'to'

  const [status, setStatus] = useState<PageStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    // Just validate that we have the required parameters
    if (!token || !userType || (userType !== 'from' && userType !== 'to')) {
      setStatus('invalid')
      setError('Ugyldig bekreftelseslenke')
      return
    }

    setStatus('valid')
  }, [token, userType])

  const handleConfirm = async () => {
    if (!user) return

    setIsConfirming(true)
    try {
      const response = await authFetch('/api/ownership-transfer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.error?.includes('utløpt')) {
          setStatus('expired')
        } else {
          setStatus('error')
        }
        setError(data.error)
        return
      }

      const data = await response.json()

      if (data.completed) {
        setStatus('completed')
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/admin')
        }, 3000)
      } else {
        setStatus('confirmed')
      }
    } catch {
      setStatus('error')
      setError('Kunne ikke bekrefte overføringen')
    } finally {
      setIsConfirming(false)
    }
  }

  // Loading state
  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen bg-botsy-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-botsy-lime animate-spin mx-auto mb-4" />
          <p className="text-[#6B7A94]">Laster...</p>
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
              {status === 'expired' ? 'Overføringen har utløpt' : 'Ugyldig lenke'}
            </h1>
            <p className="text-[#6B7A94] mb-6">
              {error || (status === 'expired'
                ? 'Eierskapsoverføringen har utløpt. Start en ny overføring.'
                : 'Denne lenken er ugyldig eller har allerede blitt brukt.')}
            </p>
            <Link href="/admin">
              <Button variant="outline" className="w-full">
                Gå til dashboard
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
            <Link href="/admin">
              <Button variant="outline" className="w-full">
                Gå til dashboard
              </Button>
            </Link>
          </Card>
        )}

        {/* Confirmed (waiting for other party) */}
        {status === 'confirmed' && (
          <Card className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Bekreftelse mottatt!</h1>
            <p className="text-[#6B7A94] mb-6">
              Din bekreftelse er registrert. Venter på at{' '}
              {userType === 'from' ? 'mottakeren' : 'nåværende eier'} også bekrefter.
            </p>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <Clock className="h-4 w-4" />
                <span>Overføringen fullføres når begge parter har bekreftet</span>
              </div>
            </div>
            <Link href="/admin">
              <Button variant="outline" className="w-full">
                Gå til dashboard
              </Button>
            </Link>
          </Card>
        )}

        {/* Completed */}
        {status === 'completed' && (
          <Card className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
              <Crown className="h-8 w-8 text-yellow-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Eierskap overført!</h1>
            <p className="text-[#6B7A94] mb-6">
              {userType === 'to'
                ? 'Gratulerer! Du er nå eier av bedriften.'
                : 'Eierskap er overført. Du er nå administrator.'}
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Loader2 className="h-4 w-4 text-botsy-lime animate-spin" />
              <span className="text-[#6B7A94] text-sm">Videresender til dashboard...</span>
            </div>
          </Card>
        )}

        {/* Valid - Show Confirmation */}
        {status === 'valid' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                <Crown className="h-8 w-8 text-yellow-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                {userType === 'from' ? 'Bekreft overføring' : 'Aksepter eierskap'}
              </h1>
              <p className="text-[#6B7A94]">
                {userType === 'from'
                  ? 'Du er i ferd med å overføre eierskap av bedriften.'
                  : 'Du er tilbudt eierskap av bedriften.'}
              </p>
            </div>

            {/* Warning */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-red-400 text-sm font-medium">Viktig</p>
                  <p className="text-[#6B7A94] text-xs mt-1">
                    {userType === 'from'
                      ? 'Ved å bekrefte gir du bort full kontroll over bedriftskontoen. Du vil bli nedgradert til administrator.'
                      : 'Ved å akseptere blir du eier av bedriften med full kontroll over kontoen.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action */}
            {user ? (
              <Button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bekrefter...
                  </>
                ) : userType === 'from' ? (
                  'Bekreft overføring'
                ) : (
                  'Aksepter eierskap'
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-[#6B7A94] text-sm text-center">
                  Du må være logget inn for å bekrefte.
                </p>
                <Link href={`/logg-inn?redirect=/transfer/${token}?type=${userType}`}>
                  <Button className="w-full">Logg inn</Button>
                </Link>
              </div>
            )}

            <p className="text-[#6B7A94] text-xs text-center mt-4">
              Begge parter må bekrefte for at overføringen skal fullføres.
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
