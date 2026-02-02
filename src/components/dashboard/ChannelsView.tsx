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
        return `${baseUrl}/api/webhooks/messenger` // Instagram uses same webhook as Messenger
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
            <div className="p-3 bg-[#E4405F]/10 border border-[#E4405F]/20 rounded-xl">
              <p className="text-[#A8B4C8] text-sm">
                Instagram bruker samme API som Messenger. Sørg for at Instagram-kontoen er koblet til Facebook-siden din i Meta Business Suite.
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
            </div>
          </div>
        )

      case 'messenger':
        return (
          <div className="space-y-5">
            <div className="p-3 bg-[#0084FF]/10 border border-[#0084FF]/20 rounded-xl">
              <p className="text-[#A8B4C8] text-sm">
                For å koble til Messenger trenger du en Facebook-side med admin-tilgang.
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
            <div className="p-3 bg-[#EA4335]/10 border border-[#EA4335]/20 rounded-xl">
              <p className="text-[#A8B4C8] text-sm">
                Koble til en e-postadresse for å la Botsy svare på kundehenvendelser via e-post. Vi støtter IMAP/SMTP-tilkobling.
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
              <label className="text-white text-sm font-medium block mb-2">IMAP Server</label>
              <input
                type="text"
                value={emailCredentials.imapServer || ''}
                onChange={(e) => setEmailCredentials(prev => ({ ...prev, imapServer: e.target.value }))}
                placeholder="imap.gmail.com"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">SMTP Server</label>
              <input
                type="text"
                value={emailCredentials.smtpServer || ''}
                onChange={(e) => setEmailCredentials(prev => ({ ...prev, smtpServer: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Passord / App-passord</label>
              <input
                type="password"
                value={emailCredentials.password || ''}
                onChange={(e) => setEmailCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Skriv inn passord..."
                className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 focus:ring-1 focus:ring-botsy-lime/20"
              />
              <p className="text-[#6B7A94] text-xs mt-1.5">
                For Gmail/Google Workspace, bruk et app-passord fra Google-kontoen din
              </p>
            </div>
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
