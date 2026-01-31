'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const { signIn, signInWithGoogle, error, clearError } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      await signIn(email, password)
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

          <form onSubmit={handleSubmit} className="space-y-5">
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
            Botsy har svart på 127 meldinger mens du var borte.
            Logg inn for å se hvordan det går.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">127</p>
              <p className="text-[#6B7A94] text-sm">Meldinger i dag</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-botsy-lime">94%</p>
              <p className="text-[#6B7A94] text-sm">Automatisk løst</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">4.9</p>
              <p className="text-[#6B7A94] text-sm">Kundetilfredshet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
