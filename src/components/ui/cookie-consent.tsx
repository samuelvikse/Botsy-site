'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Check, Settings } from 'lucide-react'
import { Button } from './button'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'botsy-cookie-consent'

interface CookiePreferences {
  essential: boolean // Always true
  analytics: boolean
  marketing: boolean
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay to avoid layout shift on page load
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent)
        setPreferences(saved)
      } catch {
        // Invalid consent, show banner again
        setShowBanner(true)
      }
    }
  }, [])

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs))
    setShowBanner(false)
    setShowSettings(false)

    // Here you could initialize analytics/marketing scripts based on consent
    if (prefs.analytics) {
      // Initialize analytics
      console.log('[Cookie Consent] Analytics enabled')
    }
    if (prefs.marketing) {
      // Initialize marketing scripts
      console.log('[Cookie Consent] Marketing enabled')
    }
  }

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allAccepted)
    saveConsent(allAccepted)
  }

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false,
    }
    setPreferences(essentialOnly)
    saveConsent(essentialOnly)
  }

  const saveCustomPreferences = () => {
    saveConsent(preferences)
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6"
        >
          <div className="max-w-4xl mx-auto bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            {!showSettings ? (
              // Main Banner
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                    <Cookie className="h-6 w-6 text-botsy-lime" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg mb-2">Vi bruker informasjonskapsler</h3>
                    <p className="text-[#A8B4C8] text-sm mb-4">
                      Vi bruker informasjonskapsler for å forbedre opplevelsen din, analysere trafikk,
                      og huske innstillingene dine. Les mer i vår{' '}
                      <Link href="/personvern" className="text-botsy-lime hover:underline">
                        personvernerklæring
                      </Link>.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={acceptAll} size="sm">
                        <Check className="h-4 w-4 mr-1" />
                        Godta alle
                      </Button>
                      <Button onClick={acceptEssential} variant="outline" size="sm">
                        Kun nødvendige
                      </Button>
                      <Button
                        onClick={() => setShowSettings(true)}
                        variant="ghost"
                        size="sm"
                        className="text-[#6B7A94] hover:text-white"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Innstillinger
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Settings Panel
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Cookie-innstillinger</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-[#6B7A94] hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Essential Cookies */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-white/[0.02] rounded-xl">
                    <div>
                      <p className="text-white font-medium">Nødvendige cookies</p>
                      <p className="text-[#6B7A94] text-sm mt-1">
                        Kreves for at nettsiden skal fungere. Kan ikke deaktiveres.
                      </p>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-botsy-lime/30 flex items-center px-1">
                      <div className="h-4 w-4 rounded-full bg-botsy-lime ml-auto" />
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-white/[0.02] rounded-xl">
                    <div>
                      <p className="text-white font-medium">Analyse-cookies</p>
                      <p className="text-[#6B7A94] text-sm mt-1">
                        Hjelper oss å forstå hvordan du bruker nettsiden, slik at vi kan forbedre den.
                      </p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className={`h-6 w-11 rounded-full flex items-center px-1 transition-colors ${
                        preferences.analytics ? 'bg-botsy-lime/30' : 'bg-white/[0.1]'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full transition-all ${
                        preferences.analytics ? 'bg-botsy-lime ml-auto' : 'bg-[#6B7A94] ml-0'
                      }`} />
                    </button>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-white/[0.02] rounded-xl">
                    <div>
                      <p className="text-white font-medium">Markedsføring-cookies</p>
                      <p className="text-[#6B7A94] text-sm mt-1">
                        Brukes til å vise deg relevante annonser basert på dine interesser.
                      </p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className={`h-6 w-11 rounded-full flex items-center px-1 transition-colors ${
                        preferences.marketing ? 'bg-botsy-lime/30' : 'bg-white/[0.1]'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full transition-all ${
                        preferences.marketing ? 'bg-botsy-lime ml-auto' : 'bg-[#6B7A94] ml-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={saveCustomPreferences} className="flex-1">
                    Lagre valg
                  </Button>
                  <Button onClick={acceptAll} variant="outline" className="flex-1">
                    Godta alle
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
