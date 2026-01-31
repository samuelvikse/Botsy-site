'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Phone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Key,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function SecuritySettingsView() {
  const { user, userData, setupTwoFactor, verifyTwoFactorSetup, disableTwoFactor, error, clearError, loading } = useAuth()

  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [setupStep, setSetupStep] = useState<'phone' | 'verify'>('phone')
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const is2FAEnabled = userData?.twoFactorEnabled || false

  const handleStartSetup = () => {
    clearError()
    setPhoneNumber('')
    setVerificationCode('')
    setSetupStep('phone')
    setShowSetupModal(true)
    setSuccessMessage(null)
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsProcessing(true)

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+47${phoneNumber}`
      await setupTwoFactor(formattedPhone, 'recaptcha-2fa')
      setSetupStep('verify')
    } catch {
      // Error handled by context
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsProcessing(true)

    try {
      await verifyTwoFactorSetup(verificationCode)
      setShowSetupModal(false)
      setSuccessMessage('Tofaktorautentisering er nå aktivert!')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch {
      // Error handled by context
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDisable2FA = async () => {
    clearError()
    setIsProcessing(true)

    try {
      await disableTwoFactor()
      setShowDisableModal(false)
      setSuccessMessage('Tofaktorautentisering er deaktivert')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch {
      // Error handled by context
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hidden recaptcha container for 2FA */}
      <div id="recaptcha-2fa" />

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-green-400 text-sm">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-botsy-lime/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-botsy-lime" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Sikkerhet</h2>
          <p className="text-[#6B7A94] text-sm">Administrer kontosikkerhet og autentisering</p>
        </div>
      </div>

      {/* 2FA Card */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              is2FAEnabled ? 'bg-green-500/10' : 'bg-white/[0.03]'
            }`}>
              {is2FAEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-500" />
              ) : (
                <ShieldOff className="h-6 w-6 text-[#6B7A94]" />
              )}
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Tofaktorautentisering (2FA)</h3>
              <p className="text-[#6B7A94] text-sm mb-3">
                Legg til et ekstra sikkerhetslag ved å kreve en kode fra telefonen din ved innlogging.
              </p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                is2FAEnabled
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {is2FAEnabled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Aktivert
                    {userData?.phone && (
                      <span className="text-[#6B7A94]">({userData.phone})</span>
                    )}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Ikke aktivert
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant={is2FAEnabled ? 'outline' : 'default'}
            onClick={is2FAEnabled ? () => setShowDisableModal(true) : handleStartSetup}
          >
            {is2FAEnabled ? 'Deaktiver' : 'Aktiver 2FA'}
          </Button>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-botsy-lime" />
          Kontoinformasjon
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
            <div>
              <p className="text-[#6B7A94] text-sm">E-post</p>
              <p className="text-white">{user?.email || 'Ikke tilgjengelig'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
            <div>
              <p className="text-[#6B7A94] text-sm">Telefonnummer</p>
              <p className="text-white">{userData?.phone || user?.phoneNumber || 'Ikke registrert'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[#6B7A94] text-sm">Innloggingsmetoder</p>
              <div className="flex items-center gap-2 mt-1">
                {user?.providerData.map((provider, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded-lg text-xs text-[#A8B4C8]"
                  >
                    {provider.providerId === 'password' && 'E-post/passord'}
                    {provider.providerId === 'google.com' && 'Google'}
                    {provider.providerId === 'apple.com' && 'Apple'}
                    {provider.providerId === 'microsoft.com' && 'Microsoft'}
                    {provider.providerId === 'phone' && 'Telefon'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-botsy-lime/5 border border-botsy-lime/20 rounded-2xl p-6">
        <h3 className="text-botsy-lime font-medium mb-3 flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Sikkerhetstips
        </h3>
        <ul className="space-y-2 text-[#A8B4C8] text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-botsy-lime mt-0.5 flex-shrink-0" />
            Bruk et sterkt, unikt passord for kontoen din
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-botsy-lime mt-0.5 flex-shrink-0" />
            Aktiver tofaktorautentisering for ekstra sikkerhet
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-botsy-lime mt-0.5 flex-shrink-0" />
            Logg ut av delte enheter når du er ferdig
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-botsy-lime mt-0.5 flex-shrink-0" />
            Hold telefonnummeret ditt oppdatert for kontogjenoppretting
          </li>
        </ul>
      </div>

      {/* Setup 2FA Modal */}
      <AnimatePresence>
        {showSetupModal && (
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
              className="bg-botsy-dark-card border border-white/[0.06] rounded-2xl p-6 max-w-md w-full relative"
            >
              <button
                onClick={() => setShowSetupModal(false)}
                className="absolute top-4 right-4 text-[#6B7A94] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-botsy-lime" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Aktiver 2FA</h2>
                  <p className="text-[#6B7A94] text-sm">Steg {setupStep === 'phone' ? '1' : '2'} av 2</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {setupStep === 'phone' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label className="text-white text-sm font-medium block mb-2">
                      Telefonnummer
                    </label>
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
                      Vi sender en verifiseringskode til dette nummeret
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isProcessing || phoneNumber.length < 8}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Sender kode...
                      </>
                    ) : (
                      <>
                        <Phone className="h-5 w-5 mr-2" />
                        Send verifiseringskode
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="text-white text-sm font-medium block mb-2">
                      Verifiseringskode
                    </label>
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
                      Skriv inn den 6-sifrede koden sendt til +47 {phoneNumber}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSetupStep('phone')}
                    >
                      Tilbake
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isProcessing || verificationCode.length < 6}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Aktiver 2FA'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disable 2FA Modal */}
      <AnimatePresence>
        {showDisableModal && (
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
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Deaktiver 2FA?</h2>
                </div>
              </div>

              <p className="text-[#A8B4C8] mb-6">
                Hvis du deaktiverer tofaktorautentisering vil kontoen din bare være beskyttet med passord.
                Er du sikker på at du vil fortsette?
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDisableModal(false)}
                >
                  Avbryt
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
                  onClick={handleDisable2FA}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Ja, deaktiver'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
