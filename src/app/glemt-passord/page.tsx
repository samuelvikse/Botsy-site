'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { resetPassword, error, clearError } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSubmitted(true)
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    clearError()
    setSubmitted(false)
  }

  return (
    <div className="min-h-screen bg-botsy-dark flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="inline-block mb-12">
          <Image
            src="/brand/botsy-full-logo.svg"
            alt="Botsy"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        {!submitted ? (
          <>
            <Link href="/logg-inn" className="text-[#6B7A94] hover:text-white text-sm mb-6 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Tilbake til innlogging
            </Link>

            <h1 className="text-3xl font-bold text-white mb-2">Glemt passord?</h1>
            <p className="text-[#6B7A94] mb-8">
              Ingen fare! Skriv inn e-posten din, så sender vi deg en lenke for å tilbakestille passordet.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-white text-sm font-medium block mb-2">E-post</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@epost.no"
                    required
                    className="w-full h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                  />
                </div>
              </div>

              <Button type="submit" size="xl" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sender...
                  </>
                ) : (
                  <>
                    Send tilbakestillingslenke
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-botsy-lime/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-botsy-lime" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Sjekk e-posten din</h1>
            <p className="text-[#6B7A94] mb-8">
              Vi har sendt en tilbakestillingslenke til <span className="text-white">{email}</span>.
              Lenken er gyldig i 1 time.
            </p>
            <Link href="/logg-inn">
              <Button variant="outline" size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til innlogging
              </Button>
            </Link>
            <p className="text-[#6B7A94] text-sm mt-6">
              Fikk du ikke e-post?{' '}
              <button onClick={handleRetry} className="text-botsy-lime hover:underline">
                Prøv igjen
              </button>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
