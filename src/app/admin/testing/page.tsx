'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  RefreshCw,
  Globe,
  Server,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Bot,
  Database,
  Zap,
  MessageSquare,
  Send,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'

// Developer email - only this user can access this page
const DEVELOPER_EMAIL = 'hei@botsy.no'

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  data?: Record<string, unknown>
}

export default function TestingPage() {
  return (
    <ProtectedRoute>
      <TestingContent />
    </ProtectedRoute>
  )
}

function TestingContent() {
  const { user, userData } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Test states
  const [dailySummaryTest, setDailySummaryTest] = useState<TestResult>({ status: 'idle' })
  const [websiteSyncTest, setWebsiteSyncTest] = useState<TestResult>({ status: 'idle' })
  const [testEmailTest, setTestEmailTest] = useState<TestResult>({ status: 'idle' })
  const [healthCheck, setHealthCheck] = useState<TestResult>({ status: 'idle' })
  const [aiProviderTest, setAiProviderTest] = useState<TestResult>({ status: 'idle' })

  // Preview states
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  const companyId = userData?.companyId || user?.uid

  // Check authorization
  useEffect(() => {
    if (user) {
      const authorized = user.email === DEVELOPER_EMAIL
      setIsAuthorized(authorized)
      setIsLoading(false)

      if (!authorized) {
        toast.error('Ingen tilgang', 'Denne siden er kun for utviklere')
        router.push('/admin')
      }
    }
  }, [user, router, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-botsy-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-botsy-lime animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  // Test: Send Daily Summary Email
  const handleSendDailySummary = async () => {
    if (!companyId) return
    setDailySummaryTest({ status: 'loading' })

    try {
      const response = await fetch('/api/notifications/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await response.json()

      if (response.ok) {
        setDailySummaryTest({
          status: 'success',
          message: `${data.emailsSent || 0} e-poster sendt`,
          data,
        })
        toast.success('Daglig oppsummering sendt', `${data.emailsSent || 0} e-poster ble sendt`)
      } else {
        setDailySummaryTest({
          status: 'error',
          message: data.error || 'Kunne ikke sende e-post',
        })
        toast.error('Feil', data.error || 'Kunne ikke sende daglig oppsummering')
      }
    } catch (error) {
      setDailySummaryTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Ukjent feil',
      })
      toast.error('Feil', 'Nettverksfeil ved sending av e-post')
    }
  }

  // Test: Preview Daily Summary Email
  const handlePreviewDailySummary = async () => {
    try {
      const response = await fetch('/api/test/daily-summary-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await response.json()

      if (data.html) {
        setEmailPreviewHtml(data.html)
        setShowEmailPreview(true)
      } else {
        toast.error('Feil', 'Kunne ikke generere forhåndsvisning')
      }
    } catch {
      toast.error('Feil', 'Nettverksfeil ved generering av forhåndsvisning')
    }
  }

  // Test: Website Sync
  const handleWebsiteSync = async () => {
    if (!companyId) return
    setWebsiteSyncTest({ status: 'loading' })

    try {
      const response = await fetch('/api/sync/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await response.json()

      if (data.success) {
        setWebsiteSyncTest({
          status: 'success',
          message: `Synkronisert ${data.pagesProcessed || 0} sider, ${data.faqsAdded || 0} nye FAQs`,
          data,
        })
        toast.success('Synkronisering fullført', `${data.faqsAdded || 0} nye FAQs lagt til`)
      } else {
        setWebsiteSyncTest({
          status: 'error',
          message: data.error || 'Synkronisering feilet',
        })
        toast.error('Feil', data.error || 'Synkronisering feilet')
      }
    } catch (error) {
      setWebsiteSyncTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Ukjent feil',
      })
      toast.error('Feil', 'Nettverksfeil ved synkronisering')
    }
  }

  // Test: Send Test Email
  const handleSendTestEmail = async () => {
    if (!user?.email) return
    setTestEmailTest({ status: 'loading' })

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await response.json()

      if (data.success) {
        setTestEmailTest({
          status: 'success',
          message: `E-post sendt til ${user.email}`,
          data,
        })
        toast.success('Test-e-post sendt', `Sjekk innboksen til ${user.email}`)
      } else {
        setTestEmailTest({
          status: 'error',
          message: data.error || 'Kunne ikke sende e-post',
        })
        toast.error('Feil', data.error || 'Deaktivert i produksjon')
      }
    } catch (error) {
      setTestEmailTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Ukjent feil',
      })
      toast.error('Feil', 'Nettverksfeil ved sending av e-post')
    }
  }

  // Test: Health Check
  const handleHealthCheck = async () => {
    setHealthCheck({ status: 'loading' })

    const checks = {
      firebase: false,
      resend: false,
      gemini: false,
      groq: false,
    }

    try {
      // Check Firebase by fetching company data
      if (companyId) {
        const { doc, getDoc } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')
        if (db) {
          const companyDoc = await getDoc(doc(db, 'companies', companyId))
          checks.firebase = companyDoc.exists()
        }
      }

      // Check Resend API key existence
      checks.resend = !!process.env.NEXT_PUBLIC_BASE_URL // Proxy check

      setHealthCheck({
        status: 'success',
        message: 'Helsekontroll fullført',
        data: checks,
      })
    } catch (error) {
      setHealthCheck({
        status: 'error',
        message: error instanceof Error ? error.message : 'Helsekontroll feilet',
      })
    }
  }

  // Test: AI Provider
  const handleAiProviderTest = async () => {
    setAiProviderTest({ status: 'loading' })

    try {
      const response = await fetch('/api/test/ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Si "Hei fra Botsy!" på norsk. Svar med kun den setningen.',
        }),
      })
      const data = await response.json()

      if (data.success) {
        setAiProviderTest({
          status: 'success',
          message: `Provider: ${data.provider}, Respons: ${data.response?.slice(0, 100)}`,
          data,
        })
        toast.success('AI-test vellykket', `Brukte ${data.provider}`)
      } else {
        setAiProviderTest({
          status: 'error',
          message: data.error || 'AI-test feilet',
        })
        toast.error('Feil', data.error || 'AI-test feilet')
      }
    } catch (error) {
      setAiProviderTest({
        status: 'error',
        message: error instanceof Error ? error.message : 'Ukjent feil',
      })
      toast.error('Feil', 'Nettverksfeil ved AI-test')
    }
  }

  const StatusIcon = ({ status }: { status: TestResult['status'] }) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 text-botsy-lime animate-spin" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />
      default:
        return <div className="h-5 w-5 rounded-full bg-white/10" />
    }
  }

  return (
    <div className="min-h-screen bg-botsy-dark p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Developer Testing</h1>
            <p className="text-[#6B7A94]">Kun tilgjengelig for {DEVELOPER_EMAIL}</p>
          </div>
          <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Dev Mode
          </Badge>
        </div>

        {/* System Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-botsy-lime" />
            System Info
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#6B7A94]">Bruker</p>
              <p className="text-white font-mono">{user?.email}</p>
            </div>
            <div>
              <p className="text-[#6B7A94]">Company ID</p>
              <p className="text-white font-mono text-xs">{companyId}</p>
            </div>
            <div>
              <p className="text-[#6B7A94]">Environment</p>
              <p className="text-white font-mono">{process.env.NODE_ENV}</p>
            </div>
            <div>
              <p className="text-[#6B7A94]">Base URL</p>
              <p className="text-white font-mono text-xs">{typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Email Tests */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-botsy-lime" />
            E-post Testing
          </h2>
          <div className="space-y-4">
            {/* Daily Summary */}
            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <StatusIcon status={dailySummaryTest.status} />
                <div>
                  <p className="text-white font-medium">Send daglig oppsummering</p>
                  <p className="text-[#6B7A94] text-sm">
                    {dailySummaryTest.message || 'Sender e-post til alle brukere med daglig oppsummering aktivert'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewDailySummary}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Forhåndsvis
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendDailySummary}
                  disabled={dailySummaryTest.status === 'loading'}
                >
                  {dailySummaryTest.status === 'loading' ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Send
                </Button>
              </div>
            </div>

            {/* Test Email */}
            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <StatusIcon status={testEmailTest.status} />
                <div>
                  <p className="text-white font-medium">Send test-e-post (invitasjon)</p>
                  <p className="text-[#6B7A94] text-sm">
                    {testEmailTest.message || `Sender test-invitasjon til ${user?.email}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleSendTestEmail}
                disabled={testEmailTest.status === 'loading'}
              >
                {testEmailTest.status === 'loading' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send
              </Button>
            </div>
          </div>
        </Card>

        {/* Sync Tests */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-botsy-lime" />
            Synkronisering
          </h2>
          <div className="space-y-4">
            {/* Website Sync */}
            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <StatusIcon status={websiteSyncTest.status} />
                <div>
                  <p className="text-white font-medium">Kjør nettsted-synkronisering</p>
                  <p className="text-[#6B7A94] text-sm">
                    {websiteSyncTest.message || 'Skraper nettsiden og oppdaterer kunnskapsbasen'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleWebsiteSync}
                disabled={websiteSyncTest.status === 'loading'}
              >
                {websiteSyncTest.status === 'loading' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Synkroniser
              </Button>
            </div>
          </div>
        </Card>

        {/* AI Provider Test */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-botsy-lime" />
            AI Provider
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <StatusIcon status={aiProviderTest.status} />
                <div>
                  <p className="text-white font-medium">Test AI-respons</p>
                  <p className="text-[#6B7A94] text-sm">
                    {aiProviderTest.message || 'Tester Gemini og Groq API-er'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAiProviderTest}
                disabled={aiProviderTest.status === 'loading'}
              >
                {aiProviderTest.status === 'loading' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-1" />
                )}
                Test AI
              </Button>
            </div>
          </div>
        </Card>

        {/* Health Check */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-botsy-lime" />
            System Health
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <StatusIcon status={healthCheck.status} />
                <div>
                  <p className="text-white font-medium">Kjør helsekontroll</p>
                  <p className="text-[#6B7A94] text-sm">
                    {healthCheck.message || 'Sjekker Firebase, API-nøkler og tjenester'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleHealthCheck}
                disabled={healthCheck.status === 'loading'}
              >
                {healthCheck.status === 'loading' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Sjekk
              </Button>
            </div>

            {healthCheck.data && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {Object.entries(healthCheck.data).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border ${
                      value
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`font-medium capitalize ${value ? 'text-green-400' : 'text-red-400'}`}>
                        {key}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-botsy-lime" />
            Hurtiglenker
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin">
              <Button variant="outline" className="w-full justify-start">
                Dashboard
              </Button>
            </Link>
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start">
                Firebase Console
              </Button>
            </a>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start">
                Vercel Dashboard
              </Button>
            </a>
            <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start">
                Resend Emails
              </Button>
            </a>
          </div>
        </Card>
      </div>

      {/* Email Preview Modal */}
      {showEmailPreview && emailPreviewHtml && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gray-100">
              <h3 className="font-semibold text-gray-900">E-post forhåndsvisning</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmailPreview(false)}
                className="text-gray-600"
              >
                Lukk
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={emailPreviewHtml}
                className="w-full h-full min-h-[600px]"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
