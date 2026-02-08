'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, User, Check, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

function RegisterContent() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
  const inviteEmail = searchParams.get('email')

  // Check if this is an invited user (coming from invite page)
  const isInvitedUser = redirectUrl?.startsWith('/invite/')

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: inviteEmail || '',
    password: '',
  })

  const { signUpOnly, signInWithGoogle, error, clearError } = useAuth()
  const router = useRouter()

  // Pre-fill email from invite
  useEffect(() => {
    if (inviteEmail) {
      setFormData(prev => ({ ...prev, email: inviteEmail }))
    }
  }, [inviteEmail])

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termsAccepted) return
    clearError()

    if (formData.name && formData.email && formData.password.length >= 6) {
      setIsLoading(true)
      try {
        // For invited users, use direct Firebase calls (existing behavior)
        if (isInvitedUser) {
          if (!auth || !db) throw new Error('Firebase er ikke konfigurert')

          // Create user in Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
          const user = userCredential.user

          // Update display name
          await updateProfile(user, { displayName: formData.name })

          // Create user document WITHOUT company (they'll join via invite)
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: formData.name,
            role: 'pending',
            companyId: '',
            createdAt: serverTimestamp(),
          })

          // Redirect back to invite page
          router.push(redirectUrl || '/admin')
        } else {
          // Regular registration - redirect to admin (WelcomeView shows for new users)
          await signUpOnly(formData.email, formData.password, formData.name)
          router.push('/admin')
        }
      } catch {
        // Error is handled by the auth context
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleGoogleSignIn = async () => {
    clearError()
    setIsGoogleLoading(true)

    try {
      await signInWithGoogle(true)
      // Redirect to invite page if coming from invite, otherwise to admin (WelcomeView)
      router.push(redirectUrl || '/admin')
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
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>


          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <h1 className="text-3xl font-bold text-white mb-2">
            {isInvitedUser ? 'Bli med i teamet' : 'Opprett konto'}
          </h1>
          <p className="text-[#6B7A94] mb-8">
            {isInvitedUser
              ? 'Opprett en konto for å akseptere invitasjonen'
              : 'Kom i gang med Botsy'}
          </p>

          {isInvitedUser && (
            <div className="mb-6 p-4 bg-botsy-lime/10 border border-botsy-lime/20 rounded-xl flex items-center gap-3">
              <Users className="h-5 w-5 text-botsy-lime flex-shrink-0" />
              <p className="text-[#A8B4C8] text-sm">
                Du er invitert til et team. Etter registrering blir du sendt tilbake for å akseptere invitasjonen.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-white text-sm font-medium block mb-2">Fullt navn</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Ola Nordmann"
                  required
                  className="w-full h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">E-post</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="din@bedrift.no"
                  required
                  className="w-full h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Passord</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  placeholder="Minst 8 tegn"
                  required
                  minLength={8}
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
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      formData.password.length >= i * 2 ? 'bg-botsy-lime' : 'bg-white/[0.1]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                className="h-4 w-4 mt-0.5 rounded border-white/[0.1] bg-white/[0.03] text-botsy-lime focus:ring-botsy-lime/50"
              />
              <label htmlFor="terms" className="text-[#A8B4C8] text-sm">
                Jeg godtar{' '}
                <Link href="/vilkar" className="text-botsy-lime hover:underline">vilkårene</Link>
                {' '}og{' '}
                <Link href="/personvern" className="text-botsy-lime hover:underline">personvernerklæringen</Link>
              </label>
            </div>

            <Button type="submit" size="xl" className="w-full" disabled={isLoading || !termsAccepted}>
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Oppretter konto...
                </>
              ) : (
                <>
                  Opprett konto
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-botsy-dark px-4 text-[#6B7A94] text-sm">eller</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Chrome className="h-5 w-5 mr-2" />
            )}
            Fortsett med Google
          </Button>

          <p className="text-center text-[#6B7A94] mt-8">
            Har du allerede en konto?{' '}
            <Link href="/logg-inn" className="text-botsy-lime hover:underline">
              Logg inn
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Benefits */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-botsy-dark-deep to-botsy-dark" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-botsy-lime/[0.05] rounded-full blur-[120px]" />

        <div className="relative max-w-md">
          <h2 className="text-2xl font-bold text-white mb-8">
            Hva du får med Botsy
          </h2>

          <div className="space-y-6">
            {[
              { title: '14 dager gratis', desc: 'Test alle funksjoner uten forpliktelser' },
              { title: 'Ubegrenset meldinger', desc: 'Ingen ekstra kostnad uansett volum' },
              { title: 'Alle kanaler inkludert', desc: 'Widget, SMS, Messenger, Instagram og e-post' },
              { title: 'Norsk AI', desc: 'Forstår nyanser og kontekst på norsk' },
              { title: 'GDPR-compliant', desc: 'Dine data er trygge og i EU/EØS' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-botsy-lime/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-4 w-4 text-botsy-lime" />
                </div>
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-[#6B7A94] text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-botsy-lime/5 border border-botsy-lime/20 rounded-2xl">
            <p className="text-white text-sm font-medium mb-2">
              Kom i gang på under 5 minutter
            </p>
            <p className="text-[#A8B4C8] text-sm">
              Legg inn nettsiden din, og Botsy lærer seg bedriften automatisk. Ingen komplisert oppsett eller teknisk kunnskap nødvendig.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function RegisterLoading() {
  return (
    <div className="min-h-screen bg-botsy-dark flex items-center justify-center">
      <div className="h-12 w-12 rounded-full border-2 border-white/10 border-t-botsy-lime animate-spin" />
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterContent />
    </Suspense>
  )
}
