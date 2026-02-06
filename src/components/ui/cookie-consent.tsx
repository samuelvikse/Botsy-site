'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'botsy-cookie-consent'

type ConsentValue = 'all' | 'essential' | null

export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CONSENT_KEY) as ConsentValue
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show cookie consent inside iframes (e.g. widget)
    if (window.self !== window.top) return

    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = (value: 'all' | 'essential') => {
    localStorage.setItem(CONSENT_KEY, value)
    setVisible(false)

    // Fire event so GA script can pick it up
    window.dispatchEvent(new CustomEvent('cookie-consent', { detail: value }))
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-4 z-[99999] animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="max-w-lg bg-[#141927] border border-white/[0.08] rounded-2xl shadow-2xl px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-white text-sm font-medium mb-1">Vi bruker informasjonskapsler</p>
            <p className="text-[#8896AB] text-xs leading-relaxed">
              Vi bruker nødvendige cookies og analyse-cookies for å forbedre tjenesten.{' '}
              <Link href="/personvern" className="text-botsy-lime hover:underline">
                Les mer
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => accept('essential')}
            className="flex-1 px-4 py-2 text-xs font-medium text-[#8896AB] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-colors"
          >
            Bare nødvendige
          </button>
          <button
            onClick={() => accept('all')}
            className="flex-1 px-4 py-2 text-xs font-medium text-botsy-dark bg-botsy-lime hover:bg-botsy-lime/90 rounded-xl transition-colors"
          >
            Godta alle
          </button>
        </div>
      </div>
    </div>
  )
}
