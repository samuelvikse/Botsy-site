'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Bot,
  Check,
  Upload,
  Plus,
  Trash2,
  Globe,
  X,
  Smartphone,
  Key,
  Phone,
  Loader2
} from 'lucide-react'

// Blur placeholder for images
const blurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANR1PqKytNPiuLe4EssaiWJYo23KpAypY+AfJ9VqKdc2P1f+UpTJts5MCQV3/9k='
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WebsiteAnalysisStep } from '@/components/onboarding/WebsiteAnalysisStep'
import { useAuth } from '@/contexts/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveBusinessProfile } from '@/lib/firestore'
import type { BusinessProfile } from '@/types'

type SMSProvider = 'twilio' | 'messagebird'

interface ChannelStatus {
  sms: {
    connected: boolean
    provider?: SMSProvider
    phoneNumber?: string
  }
  instagram: { connected: boolean }
  messenger: { connected: boolean }
  email: { connected: boolean }
  widget: { connected: boolean }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [personality, setPersonality] = useState({
    tone: 'friendly',
    useEmojis: true,
    useHumor: false,
    responseLength: 'balanced'
  })
  const [faqs, setFaqs] = useState([
    { question: '', answer: '' }
  ])
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { user, userData } = useAuth()

  // Channel connection state
  const [showSMSModal, setShowSMSModal] = useState(false)
  const [smsProvider, setSmsProvider] = useState<SMSProvider>('twilio')
  const [smsPhone, setSmsPhone] = useState('')
  const [smsCredentials, setSmsCredentials] = useState<Record<string, string>>({})
  const [isSavingSMS, setIsSavingSMS] = useState(false)
  const [smsError, setSmsError] = useState<string | null>(null)
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>({
    sms: { connected: false },
    instagram: { connected: false },
    messenger: { connected: false },
    email: { connected: false },
    widget: { connected: false }
  })

  const totalSteps = 5

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }])
  }

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...faqs]
    newFaqs[index][field] = value
    setFaqs(newFaqs)
  }

  const handleWebsiteAnalysisComplete = (profile: BusinessProfile) => {
    setBusinessProfile(profile)
    // Update personality based on analysis
    setPersonality(prev => ({
      ...prev,
      tone: profile.tone,
    }))
    setStep(2)
  }

  const companyId = userData?.companyId || user?.uid

  const handleSMSConnect = async () => {
    if (!companyId || !smsPhone) {
      setSmsError('Telefonnummer er påkrevd')
      return
    }

    setIsSavingSMS(true)
    setSmsError(null)

    try {
      const response = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          provider: smsProvider,
          phoneNumber: smsPhone,
          credentials: smsCredentials,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setChannelStatus(prev => ({
          ...prev,
          sms: {
            connected: true,
            provider: smsProvider,
            phoneNumber: data.phoneNumber,
          }
        }))
        setShowSMSModal(false)
        setSmsPhone('')
        setSmsCredentials({})
      } else {
        setSmsError(data.error)
      }
    } catch (error) {
      setSmsError('Kunne ikke koble til SMS')
    } finally {
      setIsSavingSMS(false)
    }
  }

  const handleChannelClick = (channelName: string) => {
    if (channelName === 'SMS') {
      setShowSMSModal(true)
    }
    // Other channels can be added here later
  }

  const handleComplete = async () => {
    if (!user || !db) return

    setIsSaving(true)
    try {
      const companyId = userData?.companyId || user.uid
      const companyRef = doc(db, 'companies', companyId)

      // Save business profile with FAQs using the new service
      if (businessProfile) {
        // Merge any additional FAQs from the form with the profile FAQs
        const additionalFaqs = faqs
          .filter(f => f.question.trim())
          .map((f, i) => ({
            id: `form-${Date.now()}-${i}`,
            question: f.question,
            answer: f.answer,
            source: 'user' as const,
            confirmed: true,
          }))

        const profileWithAllFaqs = {
          ...businessProfile,
          faqs: [...businessProfile.faqs, ...additionalFaqs],
        }

        await saveBusinessProfile(companyId, profileWithAllFaqs)
      }

      // Save other settings
      await setDoc(companyRef, {
        settings: {
          botName: 'Botsy',
          tone: personality.tone,
          useEmojis: personality.useEmojis,
          useHumor: personality.useHumor,
          responseLength: personality.responseLength,
        },
        onboardingCompleted: true,
      }, { merge: true })

      router.push('/admin')
    } catch {
      // Silent fail - user will see no redirect
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-botsy-dark-deep/50">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <Image
            src="/brand/botsy-full-logo.svg"
            alt="Botsy"
            width={100}
            height={32}
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-4">
            <span className="text-[#6B7A94] text-sm">Steg {step} av {totalSteps}</span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    i < step ? 'bg-botsy-lime' : 'bg-white/[0.1]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-12 px-4">
        <AnimatePresence mode="wait">
          {/* Step 1: Website Analysis (NEW) */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WebsiteAnalysisStep
                onComplete={handleWebsiteAnalysisComplete}
                initialProfile={businessProfile}
              />
            </motion.div>
          )}

          {/* Step 2: Personality */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-10">
                <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-8 w-8 text-botsy-lime" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Finjuster Botsys personlighet</h1>
                <p className="text-[#A8B4C8] text-lg">
                  Basert på analysen har vi foreslått innstillinger. Juster etter behov.
                </p>
              </div>

              <Card className="p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Hvordan vil du at Botsy skal kommunisere?</h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-white text-sm font-medium block mb-3">Tone</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'formal', label: 'Formell', desc: 'Profesjonell og høflig' },
                        { value: 'friendly', label: 'Vennlig', desc: 'Personlig men profesjonell' },
                        { value: 'casual', label: 'Uformell', desc: 'Avslappet og personlig' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setPersonality({ ...personality, tone: option.value })}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            personality.tone === option.value
                              ? 'border-botsy-lime bg-botsy-lime/10'
                              : 'border-white/[0.06] hover:border-white/[0.12]'
                          }`}
                        >
                          <p className="text-white font-medium mb-1">{option.label}</p>
                          <p className="text-[#6B7A94] text-sm">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium block mb-3">Svarlengde</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'short', label: 'Kort', desc: 'Rett på sak' },
                        { value: 'balanced', label: 'Balansert', desc: 'Passe detaljert' },
                        { value: 'detailed', label: 'Detaljert', desc: 'Grundig og utfyllende' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setPersonality({ ...personality, responseLength: option.value })}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            personality.responseLength === option.value
                              ? 'border-botsy-lime bg-botsy-lime/10'
                              : 'border-white/[0.06] hover:border-white/[0.12]'
                          }`}
                        >
                          <p className="text-white font-medium mb-1">{option.label}</p>
                          <p className="text-[#6B7A94] text-sm">{option.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl">
                      <div>
                        <p className="text-white font-medium">Bruk emojis</p>
                        <p className="text-[#6B7A94] text-sm">La Botsy bruke emojis i svar</p>
                      </div>
                      <button
                        onClick={() => setPersonality({ ...personality, useEmojis: !personality.useEmojis })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${
                          personality.useEmojis ? 'bg-botsy-lime' : 'bg-white/[0.1]'
                        }`}
                      >
                        <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${
                          personality.useEmojis ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl">
                      <div>
                        <p className="text-white font-medium">Bruk humor</p>
                        <p className="text-[#6B7A94] text-sm">La Botsy være litt morsom når det passer</p>
                      </div>
                      <button
                        onClick={() => setPersonality({ ...personality, useHumor: !personality.useHumor })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${
                          personality.useHumor ? 'bg-botsy-lime' : 'bg-white/[0.1]'
                        }`}
                      >
                        <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${
                          personality.useHumor ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: FAQs */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-10">
                <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-8 w-8 text-botsy-lime" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Legg til FAQs</h1>
                <p className="text-[#A8B4C8] text-lg">
                  Hva spør kundene dine oftest om? Botsy lærer fra disse.
                </p>
              </div>

              <Card className="p-8">
                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div key={index} className="p-4 bg-white/[0.02] rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[#6B7A94] text-sm">FAQ #{index + 1}</span>
                        {faqs.length > 1 && (
                          <button
                            onClick={() => removeFaq(index)}
                            className="text-[#6B7A94] hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Spørsmål, f.eks. 'Hva er åpningstidene?'"
                        value={faq.question}
                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                        className="w-full h-10 px-4 mb-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                      />
                      <textarea
                        placeholder="Svar..."
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
                      />
                    </div>
                  ))}

                  <button
                    onClick={addFaq}
                    className="w-full p-4 border border-dashed border-white/[0.1] rounded-xl text-[#6B7A94] hover:text-white hover:border-white/[0.2] transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Legg til flere FAQs
                  </button>
                </div>

                <p className="text-[#6B7A94] text-sm mt-6 text-center">
                  Du kan legge til flere FAQs senere i dashboardet
                </p>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Channels */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-10">
                <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-6">
                  <Upload className="h-8 w-8 text-botsy-lime" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Koble til kanaler</h1>
                <p className="text-[#A8B4C8] text-lg">
                  Velg hvor Botsy skal svare kunder. Du kan alltid endre dette senere.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  { name: 'Instagram', desc: 'Instagram Direct Messages', color: '#E4405F', popular: true, key: 'instagram' },
                  { name: 'Messenger', desc: 'Facebook Pages', color: '#0084FF', popular: true, key: 'messenger' },
                  { name: 'SMS', desc: 'Norske mobilnumre', color: '#CDFF4D', popular: false, key: 'sms' },
                  { name: 'E-post', desc: 'IMAP/SMTP', color: '#EA4335', popular: false, key: 'email' },
                  { name: 'Widget', desc: 'Settes opp i dashbordet', color: '#BFFF00', popular: false, key: 'widget', dashboardOnly: true }
                ].map((channel) => {
                  const status = channelStatus[channel.key as keyof ChannelStatus]
                  const isConnected = status?.connected
                  const isDashboardOnly = 'dashboardOnly' in channel && channel.dashboardOnly

                  return (
                    <Card key={channel.name} className={`p-5 ${isDashboardOnly ? 'opacity-70' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${channel.color}20` }}
                          >
                            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: channel.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{channel.name}</p>
                              {channel.popular && (
                                <span className="text-xs bg-botsy-lime/10 text-botsy-lime px-2 py-0.5 rounded-full">
                                  Populær
                                </span>
                              )}
                              {isConnected && (
                                <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Tilkoblet
                                </span>
                              )}
                            </div>
                            <p className="text-[#6B7A94] text-sm">
                              {isConnected && channel.key === 'sms' && channelStatus.sms.phoneNumber
                                ? channelStatus.sms.phoneNumber
                                : channel.desc}
                            </p>
                          </div>
                        </div>
                        {isDashboardOnly ? (
                          <span className="text-[#6B7A94] text-sm">I dashbordet</span>
                        ) : (
                          <Button
                            variant={isConnected ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleChannelClick(channel.name)}
                            disabled={channel.key !== 'sms'} // Only SMS is functional for now
                          >
                            {isConnected ? 'Endre' : 'Koble til'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>

              <p className="text-[#6B7A94] text-sm mt-6 text-center">
                Du kan hoppe over dette steget og koble til kanaler senere
              </p>

              {/* SMS Configuration Modal */}
              <AnimatePresence>
                {showSMSModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowSMSModal(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="bg-botsy-dark-deep border border-white/[0.06] rounded-2xl p-6 max-w-md w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#CDFF4D]/10 flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-[#CDFF4D]" />
                          </div>
                          <h3 className="text-white font-semibold">Koble til SMS</h3>
                        </div>
                        <button
                          onClick={() => setShowSMSModal(false)}
                          className="text-[#6B7A94] hover:text-white transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {smsError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                          {smsError}
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Provider Selection */}
                        <div>
                          <label className="text-white text-sm font-medium block mb-2">
                            Leverandør
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 'twilio' as const, label: 'Twilio' },
                              { value: 'messagebird' as const, label: 'MessageBird' }
                            ].map((provider) => (
                              <button
                                key={provider.value}
                                onClick={() => {
                                  setSmsProvider(provider.value)
                                  setSmsCredentials({})
                                }}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                  smsProvider === provider.value
                                    ? 'border-botsy-lime bg-botsy-lime/10 text-botsy-lime'
                                    : 'border-white/[0.06] text-[#A8B4C8] hover:border-white/[0.12] hover:text-white'
                                }`}
                              >
                                {provider.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="text-white text-sm font-medium block mb-2">
                            <Phone className="h-4 w-4 inline mr-1" />
                            Telefonnummer
                          </label>
                          <input
                            type="tel"
                            value={smsPhone}
                            onChange={(e) => setSmsPhone(e.target.value)}
                            placeholder="+4712345678"
                            className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                          />
                        </div>

                        {/* Credentials */}
                        {smsProvider === 'twilio' && (
                          <>
                            <div>
                              <label className="text-white text-sm font-medium block mb-2">
                                <Key className="h-4 w-4 inline mr-1" />
                                Account SID
                              </label>
                              <input
                                type="text"
                                value={smsCredentials.accountSid || ''}
                                onChange={(e) => setSmsCredentials(prev => ({ ...prev, accountSid: e.target.value }))}
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                              />
                            </div>
                            <div>
                              <label className="text-white text-sm font-medium block mb-2">
                                <Key className="h-4 w-4 inline mr-1" />
                                Auth Token
                              </label>
                              <input
                                type="password"
                                value={smsCredentials.authToken || ''}
                                onChange={(e) => setSmsCredentials(prev => ({ ...prev, authToken: e.target.value }))}
                                placeholder="Skriv inn auth token..."
                                className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                              />
                            </div>
                          </>
                        )}

                        {smsProvider === 'messagebird' && (
                          <div>
                            <label className="text-white text-sm font-medium block mb-2">
                              <Key className="h-4 w-4 inline mr-1" />
                              API Key
                            </label>
                            <input
                              type="password"
                              value={smsCredentials.apiKey || ''}
                              onChange={(e) => setSmsCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="Skriv inn API key..."
                              className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                            />
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowSMSModal(false)}
                            className="flex-1"
                          >
                            Avbryt
                          </Button>
                          <Button
                            onClick={handleSMSConnect}
                            disabled={isSavingSMS || !smsPhone}
                            className="flex-1"
                          >
                            {isSavingSMS ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Kobler til...
                              </>
                            ) : (
                              'Koble til'
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-5xl mx-auto"
            >
              <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[60vh]">
                <div className="text-center lg:text-left">
                  <h1 className="text-4xl font-bold text-white mb-4">Du er klar!</h1>
                  <p className="text-[#A8B4C8] text-lg mb-10 max-w-md mx-auto lg:mx-0">
                    Botsy er nå satt opp og klar til å hjelpe kundene dine.
                    Du kan finjustere innstillingene når som helst.
                  </p>

                  <div className="grid grid-cols-4 gap-4 mb-10 max-w-lg mx-auto lg:mx-0">
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                        <Check className="h-6 w-6 text-botsy-lime" />
                      </div>
                      <p className="text-white text-sm font-medium">Analyse</p>
                      <p className="text-[#6B7A94] text-xs">Fullført</p>
                    </div>
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                        <Check className="h-6 w-6 text-botsy-lime" />
                      </div>
                      <p className="text-white text-sm font-medium">Personlighet</p>
                      <p className="text-[#6B7A94] text-xs">Konfigurert</p>
                    </div>
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                        <Check className="h-6 w-6 text-botsy-lime" />
                      </div>
                      <p className="text-white text-sm font-medium">FAQs</p>
                      <p className="text-[#6B7A94] text-xs">{faqs.filter(f => f.question).length} lagt til</p>
                    </div>
                    <div className="text-center">
                      <div className="h-12 w-12 rounded-xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                        <Check className="h-6 w-6 text-botsy-lime" />
                      </div>
                      <p className="text-white text-sm font-medium">Kanaler</p>
                      <p className="text-[#6B7A94] text-xs">Klar</p>
                    </div>
                  </div>

                  <Button
                    size="xl"
                    className="shadow-lg shadow-botsy-lime/20"
                    onClick={handleComplete}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Lagrer...' : 'Gå til dashboardet'}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>

                <div className="hidden lg:flex items-center justify-center">
                  <Image
                    src="/images/klarskjerm.png"
                    alt="Botsy er klar til bruk"
                    width={500}
                    height={500}
                    className="w-full h-auto max-w-lg"
                    priority
                    placeholder="blur"
                    blurDataURL={blurDataURL}
                    sizes="(max-width: 1024px) 0vw, 500px"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="max-w-2xl mx-auto mt-8 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
          ) : (
            <div />
          )}

          {step > 1 && step < 5 && (
            <Button onClick={() => setStep(step + 1)}>
              {step === 4 ? 'Fullfør' : 'Fortsett'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
