'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, Loader2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

type LoginMethod = 'email' | 'phone'

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showVerification, setShowVerification] = useState(false)
  const [showMfaVerification, setShowMfaVerification] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    signIn,
    signInWithGoogle,
    sendPhoneVerification,
    verifyPhoneCode,
    sendMfaCode,
    verifyMfaCode,
    mfaResolver,
    error,
    clearError
  } = useAuth()
  const router = useRouter()
  const [mfaCodeSent, setMfaCodeSent] = useState(false)

  // Send MFA code when modal is shown
  useEffect(() => {
    if (showMfaVerification && mfaResolver && !mfaCodeSent) {
      setMfaCodeSent(true)
      sendMfaCode().catch(() => {
        // Error will be shown in the error state
      })
    }
  }, [showMfaVerification, mfaResolver, mfaCodeSent, sendMfaCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      await signIn(email, password)
      router.push('/admin')
    } catch (err) {
      // Check if MFA is required
      if (err instanceof Error && err.message === 'MFA_REQUIRED') {
        setShowMfaVerification(true)
      }
      // Other errors are handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+47${phoneNumber}`
      await sendPhoneVerification(formattedPhone, 'recaptcha-container')
      setShowVerification(true)
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      await verifyPhoneCode(verificationCode)
      router.push('/admin')
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      await verifyMfaCode(verificationCode)
      router.push('/admin')
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    clearError()
    setIsGoogleLoading(true)

    try {
      await signInWithGoogle()
      router.push('/admin')
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-botsy-dark flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
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

          <h1 className="text-3xl font-bold text-white mb-2">Velkommen tilbake</h1>
          <p className="text-[#6B7A94] mb-8">Logg inn for å fortsette til dashboardet</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Hidden recaptcha container */}
          <div id="recaptcha-container" />

          {/* MFA Verification Modal */}
          <AnimatePresence>
            {showMfaVerification && mfaResolver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-botsy-dark-card border border-white/[0.06] rounded-2xl p-6 max-w-md w-full"
                >
                  <h2 className="text-xl font-bold text-white mb-2">Tofaktorautentisering</h2>
                  <p className="text-[#6B7A94] mb-6">
                    Skriv inn koden sendt til telefonen din for å fullføre innloggingen.
                  </p>
                  <form onSubmit={handleMfaVerify} className="space-y-4">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Skriv inn 6-sifret kode"
                      maxLength={6}
                      className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm text-center tracking-widest font-mono focus:outline-none focus:border-botsy-lime/50 transition-colors"
                    />
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowMfaVerification(false)}
                      >
                        Avbryt
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isLoading || verificationCode.length < 6}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Bekreft'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Method Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl">
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setShowVerification(false); clearError() }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                loginMethod === 'email'
                  ? 'bg-botsy-lime text-botsy-dark'
                  : 'text-[#A8B4C8] hover:text-white'
              }`}
            >
              <Mail className="h-4 w-4" />
              E-post
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); clearError() }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                loginMethod === 'phone'
                  ? 'bg-botsy-lime text-botsy-dark'
                  : 'text-[#A8B4C8] hover:text-white'
              }`}
            >
              <Phone className="h-4 w-4" />
              Telefon
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loginMethod === 'email' ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white text-sm font-medium">Passord</label>
                    <Link href="/glemt-passord" className="text-botsy-lime text-sm hover:underline">
                      Glemt passord?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-12 pl-12 pr-12 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7A94] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-white/[0.1] bg-white/[0.03] text-botsy-lime focus:ring-botsy-lime/50"
                  />
                  <label htmlFor="remember" className="text-[#A8B4C8] text-sm">
                    Husk meg i 30 dager
                  </label>
                </div>

                <Button type="submit" size="xl" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Logger inn...
                    </>
                  ) : (
                    <>
                      Logg inn
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="phone-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {!showVerification ? (
                  <form onSubmit={handlePhoneSubmit} className="space-y-5">
                    <div>
                      <label className="text-white text-sm font-medium block mb-2">Telefonnummer</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7A94] text-sm">+47</span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="12345678"
                          maxLength={8}
                          required
                          className="w-full h-12 pl-14 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                        />
                      </div>
                      <p className="text-[#6B7A94] text-xs mt-2">
                        Du vil motta en SMS med en verifiseringskode
                      </p>
                    </div>

                    <Button type="submit" size="xl" className="w-full" disabled={isLoading || phoneNumber.length < 8}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sender kode...
                        </>
                      ) : (
                        <>
                          Send verifiseringskode
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-5">
                    <div>
                      <label className="text-white text-sm font-medium block mb-2">Verifiseringskode</label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        maxLength={6}
                        required
                        className="w-full h-12 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm text-center tracking-widest font-mono focus:outline-none focus:border-botsy-lime/50 transition-colors"
                      />
                      <p className="text-[#6B7A94] text-xs mt-2">
                        Kode sendt til +47 {phoneNumber}
                      </p>
                    </div>

                    <Button type="submit" size="xl" className="w-full" disabled={isLoading || verificationCode.length < 6}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Verifiserer...
                        </>
                      ) : (
                        <>
                          Bekreft kode
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setShowVerification(false)}
                      className="w-full text-[#6B7A94] text-sm hover:text-white transition-colors"
                    >
                      Bruk et annet nummer
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-botsy-dark px-4 text-[#6B7A94] text-sm">eller fortsett med</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Chrome className="h-5 w-5" />
                Fortsett med Google
              </>
            )}
          </Button>

          <p className="text-center text-[#6B7A94] mt-8">
            Har du ikke en konto?{' '}
            <Link href="/registrer" className="text-botsy-lime hover:underline">
              Registrer deg gratis
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-botsy-dark-deep to-botsy-dark" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-botsy-lime/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-botsy-lime/[0.03] rounded-full blur-[100px]" />

        <div className="relative text-center max-w-md">
          <div className="h-20 w-20 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-8">
            <Image
              src="/brand/botsy-icon.svg"
              alt="Botsy"
              width={48}
              height={48}
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Din digitale kollega venter
          </h2>
          <p className="text-[#A8B4C8]">
            Logg inn for å se dashboardet ditt og følge med på hvordan Botsy hjelper kundene dine.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-[#6B7A94] text-sm">Alltid på</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-botsy-lime">&lt;3s</p>
              <p className="text-[#6B7A94] text-sm">Responstid</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-[#6B7A94] text-sm">Norsk</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
