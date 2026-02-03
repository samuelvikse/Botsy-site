'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  MessageCircle,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Key,
  X,
  ChevronRight,
  ArrowRight,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { doc, getDoc, setDoc, deleteField, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  ChannelType,
  SMSProvider,
} from '@/types'

interface ChannelsViewProps {
  companyId: string
}

interface ChannelState {
  isConfigured: boolean
  isActive: boolean
  isVerified: boolean
  details?: Record<string, string>
}

const CHANNELS = [
  {
    id: 'messenger' as const,
    name: 'Messenger',
    icon: MessageCircle,
    color: '#0084FF',
    description: 'Koble til Facebook-siden din for Messenger-støtte',
  },
  {
    id: 'instagram' as const,
    name: 'Instagram',
    icon: MessageCircle,
    color: '#E4405F',
    description: 'Svar på Instagram DMs automatisk',
  },
  {
    id: 'sms' as const,
    name: 'SMS',
    icon: Phone,
    color: '#CDFF4D',
    description: 'Svar på SMS fra kunder automatisk',
  },
  {
    id: 'email' as const,
    name: 'E-post',
    icon: Mail,
    color: '#EA4335',
    description: 'Svar på e-post fra kunder automatisk',
  },
]

const SMS_PROVIDERS = [
  {
    value: 'twilio' as const,
    name: 'Twilio',
    description: 'Populær SMS-leverandør med god Norge-støtte',
    recommended: true,
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text' },
      { key: 'authToken', label: 'Auth Token', type: 'password' },
    ],
  },
  {
    value: 'messagebird' as const,
    name: 'MessageBird',
    description: 'Europeisk leverandør med konkurransedyktige priser',
    recommended: false,
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
]


export function ChannelsView({ companyId }: ChannelsViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [channels, setChannels] = useState<Record<ChannelType, ChannelState>>({
    sms: { isConfigured: false, isActive: false, isVerified: false },
    instagram: { isConfigured: false, isActive: false, isVerified: false },
    messenger: { isConfigured: false, isActive: false, isVerified: false },
    widget: { isConfigured: false, isActive: false, isVerified: false },
    email: { isConfigured: false, isActive: false, isVerified: false },
  })

  // Horizontal panel state
  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null)
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false)
  const [disconnectChannel, setDisconnectChannel] = useState<ChannelType | null>(null)

  // Form states
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  // Channel-specific form states
  const [smsProvider, setSmsProvider] = useState<SMSProvider>('twilio')
  const [smsPhone, setSmsPhone] = useState('')
  const [smsCredentials, setSmsCredentials] = useState<Record<string, string>>({})

  const [messengerPageId, setMessengerPageId] = useState('')
  const [messengerPageName, setMessengerPageName] = useState('')
  const [messengerCredentials, setMessengerCredentials] = useState<Record<string, string>>({})

  const [instagramPageId, setInstagramPageId] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [instagramCredentials, setInstagramCredentials] = useState<Record<string, string>>({})

  const [emailAddress, setEmailAddress] = useState('')
  const [emailCredentials, setEmailCredentials] = useState<Record<string, string>>({})

  // Facebook OAuth states
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false)
  const [facebookConnectChannel, setFacebookConnectChannel] = useState<'instagram' | 'messenger' | null>(null)

  // Google OAuth states
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)

  // SMS guide states
  const [showSmsGuide, setShowSmsGuide] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://botsy.no'

  const fetchChannels = useCallback(async () => {
    if (!db) return

    try {
      setIsLoading(true)
      const companyDoc = await getDoc(doc(db, 'companies', companyId))
      const data = companyDoc.exists() ? companyDoc.data() : {}
      const channelsData = data?.channels || {}

      const newChannels: Record<ChannelType, ChannelState> = {
        sms: { isConfigured: false, isActive: false, isVerified: false },
        instagram: { isConfigured: false, isActive: false, isVerified: false },
        messenger: { isConfigured: false, isActive: false, isVerified: false },
        widget: { isConfigured: false, isActive: false, isVerified: false },
        email: { isConfigured: false, isActive: false, isVerified: false },
      }

      if (channelsData.sms) {
        newChannels.sms = {
          isConfigured: true,
          isActive: channelsData.sms.isActive,
          isVerified: channelsData.sms.isVerified,
          details: { phoneNumber: channelsData.sms.phoneNumber, provider: channelsData.sms.provider },
        }
        setSmsProvider(channelsData.sms.provider)
        setSmsPhone(channelsData.sms.phoneNumber)
      }

      if (channelsData.messenger) {
        newChannels.messenger = {
          isConfigured: true,
          isActive: channelsData.messenger.isActive,
          isVerified: channelsData.messenger.isVerified,
          details: { pageName: channelsData.messenger.pageName, pageId: channelsData.messenger.pageId },
        }
        setMessengerPageId(channelsData.messenger.pageId)
        setMessengerPageName(channelsData.messenger.pageName)
      }

      if (channelsData.instagram) {
        newChannels.instagram = {
          isConfigured: true,
          isActive: channelsData.instagram.isActive,
          isVerified: channelsData.instagram.isVerified,
          details: { username: channelsData.instagram.username, pageId: channelsData.instagram.pageId },
        }
        setInstagramPageId(channelsData.instagram.pageId)
        setInstagramUsername(channelsData.instagram.username)
      }

      if (channelsData.email) {
        newChannels.email = {
          isConfigured: true,
          isActive: channelsData.email.isActive,
          isVerified: channelsData.email.isVerified,
          details: { emailAddress: channelsData.email.emailAddress },
        }
        setEmailAddress(channelsData.email.emailAddress)
      }

      setChannels(newChannels)
    } catch {
      // Silent fail - channels will show as not configured
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // Handle Facebook OAuth callback results from URL params
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const fbSuccess = params.get('fb_success')
    const fbPage = params.get('fb_page')
    const fbError = params.get('fb_error')
    const googleSuccess = params.get('google_success')
    const googleEmail = params.get('google_email')
    const googleError = params.get('google_error')

    if (fbSuccess) {
      const channelName = fbSuccess === 'instagram' ? 'Instagram' : 'Messenger'
      toast.success(
        `${channelName} tilkoblet!`,
        fbPage ? `Koblet til ${fbPage}` : `${channelName} er nå konfigurert`
      )
      // Remove query params from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      // Refresh channel data
      fetchChannels()
    } else if (fbError) {
      toast.error('Facebook-tilkobling feilet', fbError)
      // Remove query params from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    if (googleSuccess) {
      toast.success(
        'Gmail tilkoblet!',
        googleEmail ? `Koblet til ${googleEmail}` : 'E-post er nå konfigurert'
      )
      // Remove query params from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      // Refresh channel data
      fetchChannels()
    } else if (googleError) {
      toast.error('Google-tilkobling feilet', googleError)
      // Remove query params from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [toast, fetchChannels])

  const handleConnectWithFacebook = (channel: 'instagram' | 'messenger') => {
    setIsConnectingFacebook(true)
    setFacebookConnectChannel(channel)

    // Redirect to Facebook OAuth
    const oauthUrl = `/api/auth/facebook?channel=${channel}&companyId=${companyId}`
    window.location.href = oauthUrl
  }

  const handleConnectWithGoogle = () => {
    setIsConnectingGoogle(true)

    // Redirect to Google OAuth
    const oauthUrl = `/api/auth/google?companyId=${companyId}`
    window.location.href = oauthUrl
  }

  const openConfigPanel = (channelId: ChannelType) => {
    setActiveChannel(channelId)
    setError(null)
    setSuccess(null)
  }

  const closeConfigPanel = () => {
    setActiveChannel(null)
    setError(null)
    setSuccess(null)
  }

  const handleDisconnect = (channelId: ChannelType) => {
    setDisconnectChannel(channelId)
    setDisconnectModalOpen(true)
  }

  const confirmDisconnect = async () => {
    if (!disconnectChannel || !db) return

    setIsSaving(true)
    try {
      // Delete channel by setting it to deleteField()
      await setDoc(
        doc(db, 'companies', companyId),
        {
          channels: {
            [disconnectChannel]: deleteField(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      toast.success('Kanal frakoblet', `${CHANNELS.find(c => c.id === disconnectChannel)?.name} ble deaktivert`)
      await fetchChannels()
      closeConfigPanel()
    } catch (err) {
      console.error('Disconnect channel error:', err)
      toast.error('Feil', 'Kunne ikke koble fra kanalen')
    } finally {
      setIsSaving(false)
      setDisconnectModalOpen(false)
      setDisconnectChannel(null)
    }
  }

  const handleToggleActive = async (channelId: ChannelType, newActiveState: boolean) => {
    if (!db) return

    try {
      // Update only the isActive field, keeping all other data
      await setDoc(
        doc(db, 'companies', companyId),
        {
          channels: {
            [channelId]: {
              isActive: newActiveState,
              updatedAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      toast.success(
        newActiveState ? 'Kanal aktivert' : 'Kanal deaktivert',
        `${CHANNELS.find(c => c.id === channelId)?.name} er nå ${newActiveState ? 'aktiv' : 'inaktiv'}`
      )
      await fetchChannels()
    } catch (err) {
      console.error('Toggle channel error:', err)
      toast.error('Feil', 'Kunne ikke endre kanalstatus')
    }
  }

  const handleSaveChannel = async () => {
    if (!activeChannel) return

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    let payload: Record<string, unknown> = {
      companyId,
      channel: activeChannel,
    }

    // Build channel-specific payload
    switch (activeChannel) {
      case 'sms':
        if (!smsPhone) {
          setError('Telefonnummer er påkrevd')
          setIsSaving(false)
          return
        }
        // Validate E.164 format
        if (!/^\+[1-9]\d{6,14}$/.test(smsPhone.replace(/\s/g, ''))) {
          setError('Ugyldig telefonnummer. Bruk E.164 format (f.eks. +4712345678)')
          setIsSaving(false)
          return
        }
        payload = {
          ...payload,
          provider: smsProvider,
          phoneNumber: smsPhone.replace(/\s/g, ''),
          credentials: smsCredentials,
        }
        break

      case 'instagram':
        if (!instagramPageId || !instagramUsername) {
          setError('Page ID og Instagram brukernavn er påkrevd')
          setIsSaving(false)
          return
        }
        payload = {
          ...payload,
          pageId: instagramPageId,
          username: instagramUsername,
          credentials: instagramCredentials,
        }
        break

      case 'messenger':
        if (!messengerPageId || !messengerPageName) {
          setError('Page ID og Page Name er påkrevd')
          setIsSaving(false)
          return
        }
        payload = {
          ...payload,
          pageId: messengerPageId,
          pageName: messengerPageName,
          credentials: messengerCredentials,
        }
        break

      case 'email':
        if (!emailAddress) {
          setError('E-postadresse er påkrevd')
          setIsSaving(false)
          return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
          setError('Ugyldig e-postadresse')
          setIsSaving(false)
          return
        }
        payload = {
          ...payload,
          emailAddress,
          credentials: emailCredentials,
        }
        break
      }

    try {
      if (!db) throw new Error('Database not initialized')

      // Build channel data
      const channelData: Record<string, unknown> = {
        isActive: true,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      switch (activeChannel) {
        case 'sms':
          channelData.provider = smsProvider
          channelData.phoneNumber = smsPhone.replace(/\s/g, '')
          channelData.credentials = smsCredentials
          break
        case 'messenger':
          channelData.pageId = messengerPageId
          channelData.pageName = messengerPageName
          channelData.credentials = messengerCredentials
          break
        case 'instagram':
          channelData.pageId = instagramPageId
          channelData.username = instagramUsername
          channelData.credentials = instagramCredentials
          break
        case 'email':
          channelData.emailAddress = emailAddress
          channelData.credentials = emailCredentials
          break
      }

      // Save directly to Firestore
      await setDoc(
        doc(db, 'companies', companyId),
        {
          channels: {
            [activeChannel]: channelData,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      setSuccess('Konfigurasjon lagret!')
      toast.success('Kanal konfigurert', `${CHANNELS.find(c => c.id === activeChannel)?.name} ble aktivert`)
      await fetchChannels()
      setTimeout(() => closeConfigPanel(), 1500)
    } catch (err) {
      console.error('Save channel error:', err)
      setError('Kunne ikke lagre konfigurasjon')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getWebhookUrl = (channel: ChannelType) => {
    switch (channel) {
      case 'sms':
        return `${baseUrl}/api/webhooks/sms?provider=${smsProvider}`
      case 'messenger':
        return `${baseUrl}/api/webhooks/messenger`
      case 'instagram':
        return `${baseUrl}/api/webhooks/instagram`
      case 'email':
        return `${baseUrl}/api/webhooks/email`
      default:
        return ''
    }
  }

  const renderConfigForm = () => {
    if (!activeChannel) return null

    switch (activeChannel) {
      case 'sms':
        return (
          <div className="space-y-5">
            <div>
              <label className="text-white text-sm font-medium block mb-3">Velg leverandør</label>
              <div className="flex flex-wrap gap-2">
                {SMS_PROVIDERS.map((provider) => (
                  <button
                    key={provider.value}
                    onClick={() => {
                      setSmsProvider(provider.value)
                      setSmsCredentials({})
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      smsProvider === provider.value
                        ? 'bg-botsy-lime text-gray-900'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {provider.name}
                    {provider.recommended && ' ✓'}
                  </button>
                ))}
              </div>
            </div>

            {/* SMS Guide Section */}
            <div className="p-4 bg-[#CDFF4D]/5 border border-[#CDFF4D]/20 rounded-xl">
              <button
                onClick={() => setShowSmsGuide(!showSmsGuide)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="text-white font-medium text-sm">Slik finner du credentials</span>
                </div>
                <ChevronRight className={`h-4 w-4 text-[#CDFF4D] transition-transform ${showSmsGuide ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showSmsGuide && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3">
                      {smsProvider === 'twilio' ? (
                        <>
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#CDFF4D]/20 text-[#CDFF4D] text-xs font-bold flex items-center justify-center">1</span>
                            <p className="text-[#A8B4C8] text-sm">
                              Logg inn på <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-[#CDFF4D] hover:underline">console.twilio.com</a>
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#CDFF4D]/20 text-[#CDFF4D] text-xs font-bold flex items-center justify-center">2</span>
                            <p className="text-[#A8B4C8] text-sm">
                              Finn <strong className="text-white">Account SID</strong> og <strong className="text-white">Auth Token</strong> på forsiden (Dashboard)
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#CDFF4D]/20 text-[#CDFF4D] text-xs font-bold flex items-center justify-center">3</span>
                            <p className="text-[#A8B4C8] text-sm">
                              Gå til <strong className="text-white">"Phone Numbers"</strong> → <strong className="text-white">"Manage"</strong> → <strong className="text-white">"Active numbers"</strong> for å finne telefonnummeret ditt
                            </p>
                          </div>
                          <a
                            href="https://console.twilio.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#F22F46]/10 border border-[#F22F46]/30 rounded-lg text-[#F22F46] text-sm font-medium hover:bg-[#F22F46]/20 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Åpne Twilio Console
                          </a>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#CDFF4D]/20 text-[#CDFF4D] text-xs font-bold flex items-center justify-center">1</span>
                            <p className="text-[#A8B4C8] text-sm">
                              Logg inn på <a href="https://dashboard.messagebird.com/" target="_blank" rel="noopener noreferrer" className="text-[#CDFF4D] hover:underline">dashboard.messagebird.com</a>
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#CDFF4D]/20 text-[#CDFF4D] text-xs font-bold flex items-center justify-center">2</span>
                            <p className="text-[#A8B4C8] text-sm">
                              Gå til <strong className="text-white">"Developers"</strong> → <strong className="text-white">"API access"</strong> i sidemenyen
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#CDFF4D]/20 text-[#CDFF4D] text-xs font-bold flex items-center justify-center">3</span>
                            <p className="text-[#A8B4C8] text-sm">
                              Kopier din <strong className="text-white">API Key</strong> (Live key for produksjon)
                            </p>
                          </div>
                          <a
                            href="https://dashboard.messagebird.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#2481D7]/10 border border-[#2481D7]/30 rounded-lg text-[#2481D7] text-sm font-medium hover:bg-[#2481D7]/20 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Åpne MessageBird Dashboard
                          </a>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">
                Telefonnummer (E.164 format)
              </label>
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+4712345678"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
              <p className="text-[#6B7A94] text-xs mt-1.5">
                Telefonnummeret du har kjøpt hos {smsProvider === 'twilio' ? 'Twilio' : 'MessageBird'}
              </p>
            </div>

            {SMS_PROVIDERS.find(p => p.value === smsProvider)?.fields.map((field) => (
              <div key={field.key}>
                <label className="text-white text-sm font-medium block mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={smsCredentials[field.key] || ''}
                  onChange={(e) => setSmsCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={`Skriv inn ${field.label.toLowerCase()}...`}
                  className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
                />
              </div>
            ))}
          </div>
        )

      case 'instagram':
        return (
          <div className="space-y-5">
            {/* Easy Connect Button */}
            {!channels.instagram.isConfigured && (
              <div className="p-4 bg-gradient-to-r from-[#E4405F]/10 to-[#F77737]/10 border border-[#E4405F]/20 rounded-xl">
                <h4 className="text-white font-medium mb-2">Enkel tilkobling</h4>
                <p className="text-[#A8B4C8] text-sm mb-4">
                  Koble til Instagram automatisk med Facebook-kontoen din. Alt konfigureres for deg.
                </p>
                <Button
                  onClick={() => handleConnectWithFacebook('instagram')}
                  disabled={isConnectingFacebook}
                  className="w-full bg-[#E4405F] hover:bg-[#d62f4d] text-white"
                >
                  {isConnectingFacebook && facebookConnectChannel === 'instagram' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kobler til...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Koble til med Facebook
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Manual setup info */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <p className="text-[#6B7A94] text-sm">
                {channels.instagram.isConfigured
                  ? 'Instagram er tilkoblet. Du kan oppdatere innstillingene nedenfor.'
                  : 'Eller konfigurer manuelt nedenfor. Instagram bruker samme API som Messenger.'}
              </p>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Instagram brukernavn</label>
              <input
                type="text"
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value)}
                placeholder="@dinbedrift"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Instagram Page ID</label>
              <input
                type="text"
                value={instagramPageId}
                onChange={(e) => setInstagramPageId(e.target.value)}
                placeholder="123456789012345"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
              <p className="text-[#6B7A94] text-xs mt-1.5">
                Finn dette i Meta Business Suite under Instagram-innstillinger
              </p>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">
                Page Access Token
              </label>
              <input
                type="password"
                value={instagramCredentials.pageAccessToken || ''}
                onChange={(e) => setInstagramCredentials(prev => ({ ...prev, pageAccessToken: e.target.value }))}
                placeholder="Bruk samme token som Messenger..."
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
              <p className="text-[#6B7A94] text-xs mt-1.5">
                Finn din Page Access Token her:{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-botsy-lime hover:underline"
                >
                  developers.facebook.com/tools/explorer
                </a>
              </p>
            </div>
          </div>
        )

      case 'messenger':
        return (
          <div className="space-y-5">
            {/* Easy Connect Button */}
            {!channels.messenger.isConfigured && (
              <div className="p-4 bg-gradient-to-r from-[#0084FF]/10 to-[#00C6FF]/10 border border-[#0084FF]/20 rounded-xl">
                <h4 className="text-white font-medium mb-2">Enkel tilkobling</h4>
                <p className="text-[#A8B4C8] text-sm mb-4">
                  Koble til Messenger automatisk med Facebook-kontoen din. Alt konfigureres for deg.
                </p>
                <Button
                  onClick={() => handleConnectWithFacebook('messenger')}
                  disabled={isConnectingFacebook}
                  className="w-full bg-[#0084FF] hover:bg-[#0073e6] text-white"
                >
                  {isConnectingFacebook && facebookConnectChannel === 'messenger' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kobler til...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Koble til med Facebook
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Manual setup info */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <p className="text-[#6B7A94] text-sm">
                {channels.messenger.isConfigured
                  ? 'Messenger er tilkoblet. Du kan oppdatere innstillingene nedenfor.'
                  : 'Eller konfigurer manuelt nedenfor. Du trenger en Facebook-side med admin-tilgang.'}
              </p>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Facebook-side navn</label>
              <input
                type="text"
                value={messengerPageName}
                onChange={(e) => setMessengerPageName(e.target.value)}
                placeholder="Min Bedrift"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Page ID</label>
              <input
                type="text"
                value={messengerPageId}
                onChange={(e) => setMessengerPageId(e.target.value)}
                placeholder="123456789012345"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">
                Page Access Token
              </label>
              <input
                type="password"
                value={messengerCredentials.pageAccessToken || ''}
                onChange={(e) => setMessengerCredentials(prev => ({ ...prev, pageAccessToken: e.target.value }))}
                placeholder="Skriv inn page access token..."
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">
                App Secret
              </label>
              <input
                type="password"
                value={messengerCredentials.appSecret || ''}
                onChange={(e) => setMessengerCredentials(prev => ({ ...prev, appSecret: e.target.value }))}
                placeholder="Skriv inn app secret..."
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>
          </div>
        )

      case 'email':
        return (
          <div className="space-y-5">
            {/* Gmail OAuth - Easy Connect */}
            {!channels.email.isConfigured && (
              <div className="p-4 bg-gradient-to-r from-[#EA4335]/10 via-[#FBBC04]/10 to-[#34A853]/10 border border-[#EA4335]/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-1">
                    <div className="w-3 h-3 rounded-full bg-[#EA4335]" />
                    <div className="w-3 h-3 rounded-full bg-[#FBBC04]" />
                    <div className="w-3 h-3 rounded-full bg-[#34A853]" />
                    <div className="w-3 h-3 rounded-full bg-[#4285F4]" />
                  </div>
                  <h4 className="text-white font-medium">Enkel tilkobling med Google</h4>
                </div>
                <p className="text-[#A8B4C8] text-sm mb-4">
                  Koble til Gmail automatisk med Google-kontoen din. Alt konfigureres for deg - ingen API-nøkler eller servere å sette opp.
                </p>
                <Button
                  onClick={handleConnectWithGoogle}
                  disabled={isConnectingGoogle}
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium"
                >
                  {isConnectingGoogle ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kobler til...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Koble til med Google
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Already connected with Gmail */}
            {channels.email.isConfigured && channels.email.details?.emailAddress && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Gmail tilkoblet</p>
                    <p className="text-[#A8B4C8] text-sm">{channels.email.details.emailAddress}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            {!channels.email.isConfigured && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-[#0D0F14] text-[#6B7A94]">eller konfigurer manuelt</span>
                </div>
              </div>
            )}

            {/* Manual Configuration */}
            {!channels.email.isConfigured && (
              <>
                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <p className="text-[#6B7A94] text-sm">
                    Du kan også bruke SendGrid eller Mailgun for å sende e-post. Dette krever at du setter opp en konto hos en av leverandørene.
                  </p>
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-2">E-postadresse</label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="support@dinbedrift.no"
                    className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-3">Leverandør</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEmailCredentials(prev => ({ ...prev, provider: 'sendgrid' }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        emailCredentials.provider === 'sendgrid'
                          ? 'bg-botsy-lime text-gray-900'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      SendGrid
                    </button>
                    <button
                      onClick={() => setEmailCredentials(prev => ({ ...prev, provider: 'mailgun' }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        emailCredentials.provider === 'mailgun'
                          ? 'bg-botsy-lime text-gray-900'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Mailgun
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-2">API Key</label>
                  <input
                    type="password"
                    value={emailCredentials.apiKey || ''}
                    onChange={(e) => setEmailCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Skriv inn API key..."
                    className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
                  />
                </div>

                {emailCredentials.provider === 'mailgun' && (
                  <div>
                    <label className="text-white text-sm font-medium block mb-2">Domain</label>
                    <input
                      type="text"
                      value={emailCredentials.domain || ''}
                      onChange={(e) => setEmailCredentials(prev => ({ ...prev, domain: e.target.value }))}
                      placeholder="mg.dinbedrift.no"
                      className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )

      }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-botsy-lime animate-spin" />
      </div>
    )
  }

  const activeChannelData = CHANNELS.find(c => c.id === activeChannel)

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Kanaler</h1>
        <p className="text-[#6B7A94]">
          Koble til ulike kanaler for å la Botsy svare kunder overalt
        </p>
      </div>

      {/* Horizontal Layout: Channels List + Config Panel */}
      <div className="flex gap-6">
        {/* Channels List */}
        <div className={`transition-all duration-300 ${activeChannel ? 'w-1/2' : 'w-full'}`}>
          <div className="grid gap-3">
            {CHANNELS.map((channel) => {
              const state = channels[channel.id]
              const Icon = channel.icon
              const isActive = activeChannel === channel.id

              return (
                <motion.div
                  key={channel.id}
                  layout
                  className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-botsy-lime bg-botsy-lime/5'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                  onClick={() => openConfigPanel(channel.id)}
                >
                  <div className="p-5 flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${channel.color}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: channel.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-white font-semibold">{channel.name}</h3>
                        {state.isConfigured && (
                          <Badge className={`text-xs ${state.isActive ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {state.isActive ? 'Aktiv' : 'Konfigurert'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[#6B7A94] text-sm truncate">{channel.description}</p>
                      {state.isConfigured && state.details && (
                        <p className="text-[#A8B4C8] text-xs mt-1 font-mono truncate">
                          {state.details.phoneNumber || state.details.pageName || state.details.emailAddress}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {state.isConfigured && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleActive(channel.id, !state.isActive)
                          }}
                          className={`w-11 h-6 rounded-full relative transition-colors ${state.isActive ? 'bg-green-500' : 'bg-white/[0.1]'}`}
                          title={state.isActive ? 'Deaktiver' : 'Aktiver'}
                        >
                          <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${state.isActive ? 'right-1' : 'left-1 bg-white/50'}`} />
                        </button>
                      )}
                      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'text-botsy-lime' : 'text-white/40'}`}>
                        <ChevronRight className={`h-5 w-5 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-botsy-lime"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Configuration Panel - Slides in horizontally */}
        <AnimatePresence mode="wait">
          {activeChannel && activeChannelData && (
            <motion.div
              key={activeChannel}
              initial={{ opacity: 0, x: 50, width: 0 }}
              animate={{ opacity: 1, x: 0, width: '50%' }}
              exit={{ opacity: 0, x: 50, width: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-shrink-0"
            >
              <Card className="h-full overflow-hidden">
                {/* Header */}
                <div
                  className="p-5 flex items-center justify-between border-b border-white/[0.06]"
                  style={{ background: `linear-gradient(135deg, ${activeChannelData.color}10 0%, transparent 100%)` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${activeChannelData.color}20` }}
                    >
                      <activeChannelData.icon className="h-5 w-5" style={{ color: activeChannelData.color }} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{activeChannelData.name}</h3>
                      <p className="text-[#6B7A94] text-xs">Konfigurasjon</p>
                    </div>
                  </div>
                  <button
                    onClick={closeConfigPanel}
                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[calc(100vh-300px)]">
                  {/* Error/Success Messages */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
                      >
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-5 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
                      >
                        <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <p className="text-green-400 text-sm">{success}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Channel-specific form */}
                  {renderConfigForm()}

                  {/* Webhook URL */}
                  <div className="mt-6 p-4 bg-botsy-lime/5 border border-botsy-lime/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4 text-botsy-lime" />
                      <h4 className="text-botsy-lime text-sm font-medium">Webhook URL</h4>
                    </div>
                    <p className="text-[#A8B4C8] text-xs mb-3">
                      Konfigurer denne URL-en hos leverandøren:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2.5 bg-black/30 rounded-lg text-xs text-[#A8B4C8] overflow-x-auto font-mono">
                        {getWebhookUrl(activeChannel)}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyWebhook(getWebhookUrl(activeChannel))}>
                        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6">
                    {channels[activeChannel]?.isConfigured && (
                      <Button
                        variant="ghost"
                        onClick={() => handleDisconnect(activeChannel)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        Koble fra
                      </Button>
                    )}
                    <Button onClick={handleSaveChannel} disabled={isSaving} className="flex-1">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Lagrer...
                        </>
                      ) : (
                        <>
                          Lagre konfigurasjon
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Disconnect Confirmation */}
      <ConfirmDialog
        isOpen={disconnectModalOpen}
        onClose={() => setDisconnectModalOpen(false)}
        onConfirm={confirmDisconnect}
        title={`Koble fra ${CHANNELS.find(c => c.id === disconnectChannel)?.name}?`}
        description="Er du sikker på at du vil deaktivere denne kanalen? Botsy vil ikke lenger kunne svare på meldinger fra denne kanalen."
        confirmText="Koble fra"
        variant="warning"
      />
    </div>
  )
}
