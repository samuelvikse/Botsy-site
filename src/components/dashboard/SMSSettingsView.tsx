'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Send,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  Key,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { SMSProvider } from '@/types'

interface SMSSettingsViewProps {
  companyId: string
}

interface SMSChannelConfig {
  provider: SMSProvider
  phoneNumber: string
  isActive: boolean
  isVerified: boolean
  hasCredentials: boolean
  createdAt: string
  updatedAt: string
}

const PROVIDERS = [
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

export function SMSSettingsView({ companyId }: SMSSettingsViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const toast = useToast()

  // Configuration state
  const [isConfigured, setIsConfigured] = useState(false)
  const [config, setConfig] = useState<SMSChannelConfig | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<SMSProvider>('twilio')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testPhone, setTestPhone] = useState('')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://botsy.no'
  const webhookUrl = `${baseUrl}/api/webhooks/sms?provider=${selectedProvider}`

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sms/config?companyId=${companyId}`)
      const data = await response.json()

      if (data.success) {
        setIsConfigured(data.configured)
        if (data.channel) {
          setConfig(data.channel)
          setSelectedProvider(data.channel.provider)
          setPhoneNumber(data.channel.phoneNumber)
        }
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Kunne ikke hente SMS-konfigurasjon')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const response = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          provider: selectedProvider,
          phoneNumber,
          credentials,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('SMS-konfigurasjon lagret!')
        setShowForm(false)
        await fetchConfig()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Kunne ikke lagre konfigurasjon')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testPhone) {
      setError('Skriv inn et telefonnummer for testing')
      return
    }

    setError(null)
    setSuccess(null)
    setIsTesting(true)

    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          testPhone,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Test-SMS sendt til ${data.sentTo}!`)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Kunne ikke sende test-SMS')
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeactivate = () => {
    setDeactivateModalOpen(true)
  }

  const confirmDeactivate = async () => {
    setDeactivateModalOpen(false)
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/sms/config?companyId=${companyId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('SMS deaktivert', 'SMS-integrasjonen ble deaktivert')
        await fetchConfig()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Kunne ikke deaktivere SMS')
      toast.error('Feil', 'Kunne ikke deaktivere SMS-integrasjonen')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedProviderConfig = PROVIDERS.find(p => p.value === selectedProvider)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-botsy-lime animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">SMS-integrasjon</h1>
        <p className="text-[#6B7A94]">
          Koble til et telefonnummer for å la Botsy svare på SMS fra kunder
        </p>
      </div>

      {/* Error/Success Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3"
          >
            <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not Configured State */}
      {!isConfigured && !showForm && (
        <Card className="p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-botsy-lime/10 flex items-center justify-center mx-auto mb-6">
            <Smartphone className="h-8 w-8 text-botsy-lime" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">
            SMS-integrasjon ikke konfigurert
          </h2>
          <p className="text-[#A8B4C8] mb-6 max-w-md mx-auto">
            Koble til et telefonnummer for å la Botsy svare på SMS fra kunder automatisk.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {PROVIDERS.map((provider) => (
              <div
                key={provider.value}
                className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium">{provider.name}</span>
                  {provider.recommended && (
                    <Badge variant="outline" className="text-xs">Anbefalt</Badge>
                  )}
                </div>
                <p className="text-[#6B7A94] text-sm">{provider.description}</p>
              </div>
            ))}
          </div>

          <Button onClick={() => setShowForm(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Konfigurer SMS
          </Button>
        </Card>
      )}

      {/* Configuration Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Konfigurer SMS</h2>

          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="text-white text-sm font-medium block mb-3">
                Velg leverandør
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.value}
                    onClick={() => {
                      setSelectedProvider(provider.value)
                      setCredentials({})
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedProvider === provider.value
                        ? 'border-botsy-lime bg-botsy-lime/10'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{provider.name}</span>
                      {provider.recommended && (
                        <Badge variant="outline" className="text-xs">Anbefalt</Badge>
                      )}
                    </div>
                    <p className="text-[#6B7A94] text-sm">{provider.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">
                <Phone className="h-4 w-4 inline mr-2" />
                Telefonnummer (E.164 format)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+4712345678"
                className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
              />
              <p className="text-[#6B7A94] text-xs mt-1">
                Dette er nummeret kundene sender SMS til
              </p>
            </div>

            {/* Credentials */}
            {selectedProviderConfig?.fields.map((field) => (
              <div key={field.key}>
                <label className="text-white text-sm font-medium block mb-2">
                  <Key className="h-4 w-4 inline mr-2" />
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={credentials[field.key] || ''}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))}
                  placeholder={`Skriv inn ${field.label.toLowerCase()}...`}
                  className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                />
              </div>
            ))}

            {/* Webhook URL Info */}
            <div className="p-4 bg-botsy-lime/5 border border-botsy-lime/20 rounded-xl">
              <h4 className="text-botsy-lime text-sm font-medium mb-2">Webhook URL</h4>
              <p className="text-[#A8B4C8] text-sm mb-3">
                Konfigurer denne URL-en i {selectedProviderConfig?.name}-dashboardet for å motta innkommende SMS:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-black/30 rounded-lg text-xs text-[#A8B4C8] overflow-x-auto">
                  {webhookUrl}
                </code>
                <Button variant="ghost" size="sm" onClick={handleCopyWebhook}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !phoneNumber}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lagrer...
                  </>
                ) : (
                  'Lagre konfigurasjon'
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Configured State */}
      {isConfigured && config && !showForm && (
        <>
          {/* Status Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-botsy-lime/10 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-botsy-lime" />
                </div>
                <div>
                  <h3 className="text-white font-medium">SMS-integrasjon</h3>
                  <p className="text-[#6B7A94] text-sm">
                    {PROVIDERS.find(p => p.value === config.provider)?.name || config.provider}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {config.isActive ? (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    Aktiv
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                    Inaktiv
                  </Badge>
                )}
                {config.isVerified && (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Verifisert
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/[0.02] rounded-xl">
                <p className="text-[#6B7A94] text-sm mb-1">Telefonnummer</p>
                <p className="text-white font-medium font-mono">{config.phoneNumber}</p>
              </div>
              <div className="p-4 bg-white/[0.02] rounded-xl">
                <p className="text-[#6B7A94] text-sm mb-1">Leverandør</p>
                <p className="text-white font-medium">
                  {PROVIDERS.find(p => p.value === config.provider)?.name || config.provider}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Rediger
              </Button>
              <Button variant="outline" size="sm" onClick={fetchConfig}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Oppdater status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeactivate}
                className="text-red-400 hover:text-red-300 hover:border-red-400/50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deaktiver
              </Button>
            </div>
          </Card>

          {/* Test SMS Card */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Test SMS-oppsett</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Send en test-SMS for å verifisere at alt fungerer som det skal.
            </p>

            <div className="flex gap-3">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+4712345678"
                className="flex-1 h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
              />
              <Button onClick={handleTest} disabled={isTesting || !testPhone}>
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sender...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send test-SMS
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Webhook Info Card */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-botsy-lime" />
              <h3 className="text-white font-medium">Webhook-konfigurasjon</h3>
            </div>
            <p className="text-[#6B7A94] text-sm mb-4">
              Sørg for at denne URL-en er konfigurert i {PROVIDERS.find(p => p.value === config.provider)?.name}-dashboardet:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-black/30 rounded-xl text-sm text-[#A8B4C8] overflow-x-auto border border-white/[0.06]">
                {webhookUrl}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopyWebhook}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-green-400" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Kopier
                  </>
                )}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      <ConfirmDialog
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onConfirm={confirmDeactivate}
        title="Deaktiver SMS-integrasjon?"
        description="Er du sikker på at du vil deaktivere SMS-integrasjonen? Botsy vil ikke lenger kunne svare på SMS."
        confirmText="Deaktiver"
        variant="warning"
      />
    </div>
  )
}
