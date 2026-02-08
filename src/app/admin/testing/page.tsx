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
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Search,
  Gift,
  Infinity,
  Pencil,
  Check,
  X as XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { Input } from '@/components/ui/input'
import { authFetch } from '@/lib/auth-fetch'

// Developer email - only this user can access this page
const DEVELOPER_EMAIL = 'hei@botsy.no'

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  data?: Record<string, unknown>
}

interface MemberData {
  id: string
  email?: string
  displayName?: string
  role: string
  status: string
  joinedAt?: string
}

interface CompanyData {
  id: string
  businessName?: string
  websiteUrl?: string
  subscriptionStatus?: string
  subscriptionTier?: string
  stripeSubscriptionId?: string
  vippsAgreementId?: string
  trialEndsAt?: string
  createdAt?: string
  ownerEmail?: string
  members: MemberData[]
  hasBusinessProfile?: boolean
}

interface CompaniesResponse {
  success: boolean
  companies: CompanyData[]
  total: number
  paying: number
  trialing: number
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
  const [hasRedirected, setHasRedirected] = useState(false)

  // Test states
  const [dailySummaryTest, setDailySummaryTest] = useState<TestResult>({ status: 'idle' })
  const [websiteSyncTest, setWebsiteSyncTest] = useState<TestResult>({ status: 'idle' })
  const [testEmailTest, setTestEmailTest] = useState<TestResult>({ status: 'idle' })
  const [healthCheck, setHealthCheck] = useState<TestResult>({ status: 'idle' })
  const [aiProviderTest, setAiProviderTest] = useState<TestResult>({ status: 'idle' })
  
  // Companies state
  const [companiesData, setCompaniesData] = useState<CompaniesResponse | null>(null)
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [grantingAccess, setGrantingAccess] = useState<string | null>(null)
  const [syncingCompany, setSyncingCompany] = useState<string | null>(null)
  const [testingWidget, setTestingWidget] = useState<string | null>(null)
  const [widgetTestResult, setWidgetTestResult] = useState<Record<string, { status: 'success' | 'error' | 'setup'; message: string }>>({})
  const [editingName, setEditingName] = useState<string | null>(null)
  const [newBusinessName, setNewBusinessName] = useState('')

  // Preview states
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  const companyId = userData?.companyId || user?.uid

  // Check authorization
  useEffect(() => {
    if (user && !hasRedirected) {
      const authorized = user.email === DEVELOPER_EMAIL
      setIsAuthorized(authorized)
      setIsLoading(false)

      if (!authorized) {
        setHasRedirected(true)
        toast.error('Ingen tilgang', 'Denne siden er kun for utviklere')
        router.push('/admin')
      }
    }
  }, [user, router, hasRedirected])

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

  // Fetch all companies with members (client-side Firestore)
  const handleFetchCompanies = async () => {
    if (!user?.email || !db) return
    setCompaniesLoading(true)

    try {
      // Get all companies
      const companiesSnapshot = await getDocs(collection(db, 'companies'))
      
      const companies: CompanyData[] = []

      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data()
        
        // Get subscription status (may be null for new signups before fix)
        const status = companyData.subscriptionStatus || null

        // Get owner user email
        let ownerEmail = ''
        try {
          const ownerDoc = await getDoc(doc(db, 'users', companyDoc.id))
          if (ownerDoc.exists()) {
            ownerEmail = ownerDoc.data()?.email || ''
          }
        } catch {
          // Ignore errors fetching owner
        }

        // Get all members for this company
        const membersQuery = query(
          collection(db, 'memberships'),
          where('companyId', '==', companyDoc.id)
        )
        const membersSnapshot = await getDocs(membersQuery)

        const members: MemberData[] = []
        
        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data()
          
          // Get user details
          let email = ''
          let displayName = ''
          try {
            const userDoc = await getDoc(doc(db, 'users', memberData.userId))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              email = userData?.email || ''
              displayName = userData?.displayName || ''
            }
          } catch {
            // Ignore errors fetching user
          }

          members.push({
            id: memberDoc.id,
            email,
            displayName,
            role: memberData.role || 'employee',
            status: memberData.status || 'active',
            joinedAt: memberData.joinedAt?.toDate?.()?.toISOString() || undefined,
          })
        }

        companies.push({
          id: companyDoc.id,
          businessName: companyData.businessName || companyData.profile?.businessName || companyData.businessProfile?.businessName,
          websiteUrl: companyData.websiteUrl || companyData.profile?.websiteUrl || companyData.businessProfile?.websiteUrl,
          subscriptionStatus: status,
          subscriptionTier: companyData.subscriptionTier,
          stripeSubscriptionId: companyData.stripeSubscriptionId,
          vippsAgreementId: companyData.vippsAgreementId,
          trialEndsAt: companyData.trialEndsAt?.toDate?.()?.toISOString() || undefined,
          createdAt: companyData.createdAt?.toDate?.()?.toISOString() || undefined,
          ownerEmail,
          members,
          hasBusinessProfile: !!companyData.businessProfile,
        })
      }

      // Sort by subscription status (no status first to find broken signups, then active, trialing, etc.)
      const statusOrder: Record<string, number> = {
        '': -1, // No status - show first (broken signups)
        active: 0,
        trialing: 1,
        past_due: 2,
        canceled: 3,
        unpaid: 4,
      }

      companies.sort((a, b) => {
        const orderA = statusOrder[a.subscriptionStatus || ''] ?? 99
        const orderB = statusOrder[b.subscriptionStatus || ''] ?? 99
        return orderA - orderB
      })

      const result: CompaniesResponse = {
        success: true,
        companies,
        total: companies.length,
        paying: companies.filter(c => c.subscriptionStatus === 'active').length,
        trialing: companies.filter(c => c.subscriptionStatus === 'trialing').length,
      }

      setCompaniesData(result)
      toast.success('Data hentet', `${result.total} virksomheter funnet`)
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Feil', 'Kunne ikke hente data fra Firestore')
    } finally {
      setCompaniesLoading(false)
    }
  }

  // Toggle company expansion
  const toggleCompanyExpand = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev)
      if (next.has(companyId)) {
        next.delete(companyId)
      } else {
        next.add(companyId)
      }
      return next
    })
  }

  // Get status badge color
  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aktiv</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Prøveperiode</Badge>
      case 'past_due':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Forfalt</Badge>
      case 'canceled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Kansellert</Badge>
      case null:
      case undefined:
      case '':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">⚠️ Ingen status</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>
    }
  }

  // Filter companies based on search query
  const filteredCompanies = companiesData?.companies.filter(company => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      company.businessName?.toLowerCase().includes(query) ||
      company.ownerEmail?.toLowerCase().includes(query) ||
      company.websiteUrl?.toLowerCase().includes(query) ||
      company.id.toLowerCase().includes(query) ||
      company.members.some(m => 
        m.email?.toLowerCase().includes(query) ||
        m.displayName?.toLowerCase().includes(query)
      )
    )
  }) || []

  // Grant free month to a company
  const handleGrantFreeMonth = async (companyId: string, businessName?: string) => {
    if (!db) return
    setGrantingAccess(companyId)

    try {
      const companyRef = doc(db, 'companies', companyId)
      const newTrialEnd = new Date()
      newTrialEnd.setMonth(newTrialEnd.getMonth() + 1)

      await updateDoc(companyRef, {
        subscriptionStatus: 'trialing',
        trialEndsAt: Timestamp.fromDate(newTrialEnd),
        grantedFreeAccess: true,
        grantedFreeAccessAt: Timestamp.now(),
        grantedFreeAccessBy: user?.email,
      })

      toast.success('Gratis måned gitt!', `${businessName || companyId} har fått 1 måned gratis tilgang til ${newTrialEnd.toLocaleDateString('nb-NO')}`)
      
      // Refresh data
      handleFetchCompanies()
    } catch (error) {
      console.error('Error granting free month:', error)
      toast.error('Feil', 'Kunne ikke gi gratis tilgang')
    } finally {
      setGrantingAccess(null)
    }
  }

  // Sync website for a specific company
  const handleSyncCompanyWebsite = async (targetCompanyId: string, businessName?: string, websiteUrl?: string) => {
    setSyncingCompany(targetCompanyId)

    try {
      const response = await authFetch('/api/sync/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: targetCompanyId, websiteUrl }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Synkronisering fullført', `${businessName || targetCompanyId}: ${data.faqsAdded || 0} nye FAQs lagt til`)
        // Refresh companies list
        handleFetchCompanies()
      } else {
        toast.error('Synkronisering feilet', data.error || 'Ukjent feil')
      }
    } catch (error) {
      console.error('Error syncing website:', error)
      toast.error('Feil', 'Kunne ikke synkronisere nettside')
    } finally {
      setSyncingCompany(null)
    }
  }

  // Test widget for a specific company
  const handleTestWidget = async (targetCompanyId: string, businessName?: string) => {
    setTestingWidget(targetCompanyId)

    try {
      const response = await authFetch(`/api/chat/${targetCompanyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hei, dette er en test!',
          sessionId: `test-${Date.now()}`
        }),
      })
      const data = await response.json()

      if (data.isSettingUp) {
        setWidgetTestResult(prev => ({
          ...prev,
          [targetCompanyId]: { status: 'setup', message: 'Setter opp bedriftsprofil...' }
        }))
        toast.info('Widget', 'Bedriftsprofil opprettes automatisk')
      } else if (data.notConfigured) {
        setWidgetTestResult(prev => ({
          ...prev,
          [targetCompanyId]: { status: 'error', message: 'Mangler nettside-URL' }
        }))
        toast.error('Widget', 'Mangler nettside-URL for denne bedriften')
      } else if (data.success && data.reply) {
        setWidgetTestResult(prev => ({
          ...prev,
          [targetCompanyId]: { status: 'success', message: data.reply.slice(0, 100) + (data.reply.length > 100 ? '...' : '') }
        }))
        toast.success('Widget OK', `${businessName || targetCompanyId} svarer korrekt`)
      } else if (data.error) {
        setWidgetTestResult(prev => ({
          ...prev,
          [targetCompanyId]: { status: 'error', message: data.error }
        }))
        toast.error('Widget feil', data.error)
      } else {
        setWidgetTestResult(prev => ({
          ...prev,
          [targetCompanyId]: { status: 'error', message: 'Ukjent respons' }
        }))
        toast.error('Widget', 'Ukjent respons fra chat API')
      }
    } catch (error) {
      console.error('Error testing widget:', error)
      setWidgetTestResult(prev => ({
        ...prev,
        [targetCompanyId]: { status: 'error', message: 'Nettverksfeil' }
      }))
      toast.error('Feil', 'Kunne ikke teste widget')
    } finally {
      setTestingWidget(null)
    }
  }

  // Grant lifetime free access to a company
  const handleGrantLifetime = async (companyId: string, businessName?: string) => {
    if (!db) return
    setGrantingAccess(companyId)

    try {
      const companyRef = doc(db, 'companies', companyId)

      await updateDoc(companyRef, {
        subscriptionStatus: 'active',
        subscriptionTier: 'lifetime',
        lifetimeAccess: true,
        grantedLifetimeAt: Timestamp.now(),
        grantedLifetimeBy: user?.email,
      })

      toast.success('Lifetime-tilgang gitt!', `${businessName || companyId} har nå gratis tilgang for alltid`)
      
      // Refresh data
      handleFetchCompanies()
    } catch (error) {
      console.error('Error granting lifetime access:', error)
      toast.error('Feil', 'Kunne ikke gi lifetime-tilgang')
    } finally {
      setGrantingAccess(null)
    }
  }

  // Update business name
  const handleUpdateBusinessName = async (companyId: string) => {
    if (!db || !newBusinessName.trim()) return

    try {
      const companyRef = doc(db, 'companies', companyId)
      await updateDoc(companyRef, {
        businessName: newBusinessName.trim(),
      })

      toast.success('Navn oppdatert!', `Virksomhetsnavn endret til "${newBusinessName.trim()}"`)
      setEditingName(null)
      setNewBusinessName('')
      
      // Refresh data
      handleFetchCompanies()
    } catch (error) {
      console.error('Error updating business name:', error)
      toast.error('Feil', 'Kunne ikke oppdatere navn')
    }
  }

  // Test: Send Daily Summary Email
  const handleSendDailySummary = async () => {
    if (!companyId) return
    setDailySummaryTest({ status: 'loading' })

    try {
      const response = await authFetch('/api/notifications/daily-summary', {
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
      const response = await authFetch('/api/test/daily-summary-preview', {
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
      const response = await authFetch('/api/sync/website', {
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
      const response = await authFetch('/api/test-email', {
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

    try {
      const response = await authFetch('/api/test/health-check')
      const data = await response.json()

      const checks = {
        firebase: data.firebase,
        resend: data.resend,
        gemini: data.gemini,
        groq: data.groq,
      }

      const allGood = Object.values(checks).every(v => v === true)

      setHealthCheck({
        status: allGood ? 'success' : 'error',
        message: allGood ? 'Helsekontroll fullført' : 'Noen tjenester feiler',
        data: checks,
      })

      if (data.errors && Object.keys(data.errors).length > 0) {
        console.log('Health check errors:', data.errors)
      }
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
      const response = await authFetch('/api/test/ai-provider', {
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
            {/* Link to Email Testing Page */}
            <Link href="/admin/testing/emails">
              <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-botsy-lime" />
                  <div>
                    <p className="text-white font-medium">Åpne E-post Testing</p>
                    <p className="text-[#6B7A94] text-sm">
                      Send og forhåndsvis alle 10 e-postmaler
                    </p>
                  </div>
                </div>
                <Button size="sm">
                  Åpne
                </Button>
              </div>
            </Link>

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

        {/* Companies & Users Overview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-botsy-lime" />
              Virksomheter & Brukere
            </h2>
            <Button
              size="sm"
              onClick={handleFetchCompanies}
              disabled={companiesLoading}
            >
              {companiesLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Hent data
            </Button>
          </div>

          {companiesData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[#6B7A94] text-sm">Totalt</p>
                  <p className="text-white text-xl font-semibold">{companiesData.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 text-sm">Betalende</p>
                  <p className="text-green-400 text-xl font-semibold">{companiesData.paying}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-blue-400 text-sm">Prøveperiode</p>
                  <p className="text-blue-400 text-xl font-semibold">{companiesData.trialing}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
                <Input
                  type="text"
                  placeholder="Søk etter virksomhet, e-post eller navn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/[0.03] border-white/[0.06]"
                />
                {searchQuery && (
                  <p className="text-[#6B7A94] text-xs mt-1">
                    Viser {filteredCompanies.length} av {companiesData.total} virksomheter
                  </p>
                )}
              </div>

              {/* Companies list */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="border border-white/[0.06] rounded-lg overflow-hidden"
                  >
                    {/* Company header */}
                    <button
                      onClick={() => toggleCompanyExpand(company.id)}
                      className="w-full p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {expandedCompanies.has(company.id) ? (
                          <ChevronDown className="h-4 w-4 text-[#6B7A94]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#6B7A94]" />
                        )}
                        <div>
                          <p className="text-white font-medium">
                            {company.businessName || 'Ukjent virksomhet'}
                          </p>
                          <p className="text-[#6B7A94] text-sm">
                            {company.ownerEmail || company.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {company.stripeSubscriptionId && (
                          <span title="Stripe">
                            <CreditCard className="h-4 w-4 text-[#6B7A94]" />
                          </span>
                        )}
                        {company.vippsAgreementId && (
                          <span className="text-xs text-[#6B7A94]">Vipps</span>
                        )}
                        {getStatusBadge(company.subscriptionStatus)}
                        {company.members.length > 0 && (
                          <Badge variant="outline" className="text-[#6B7A94]">
                            <Users className="h-3 w-3 mr-1" />
                            {company.members.length}
                          </Badge>
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {expandedCompanies.has(company.id) && (
                      <div className="p-4 border-t border-white/[0.06] bg-white/[0.01]">
                        {/* Edit Business Name */}
                        <div className="mb-4 pb-4 border-b border-white/[0.06]">
                          <p className="text-[#6B7A94] text-sm mb-2">Virksomhetsnavn</p>
                          {editingName === company.id ? (
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                value={newBusinessName}
                                onChange={(e) => setNewBusinessName(e.target.value)}
                                placeholder="Nytt virksomhetsnavn"
                                className="flex-1 bg-white/[0.03] border-white/[0.06]"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateBusinessName(company.id)}
                                disabled={!newBusinessName.trim()}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingName(null)
                                  setNewBusinessName('')
                                }}
                              >
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">
                                {company.businessName || 'Ukjent virksomhet'}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingName(company.id)
                                  setNewBusinessName(company.businessName || '')
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Pencil className="h-3 w-3 text-[#6B7A94]" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Company details */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-[#6B7A94]">Nettside</p>
                            <p className="text-white">
                              {company.websiteUrl ? (
                                <a
                                  href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-botsy-lime hover:underline"
                                >
                                  {company.websiteUrl}
                                </a>
                              ) : (
                                'Ikke satt'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#6B7A94]">Abonnement</p>
                            <p className="text-white">{company.subscriptionTier || 'Standard'}</p>
                          </div>
                          <div>
                            <p className="text-[#6B7A94]">Bedriftsprofil</p>
                            <p className={company.hasBusinessProfile ? 'text-green-400' : 'text-red-400'}>
                              {company.hasBusinessProfile ? '✓ Konfigurert' : '✗ Mangler - synk nettside'}
                            </p>
                          </div>
                          {company.trialEndsAt && (
                            <div>
                              <p className="text-[#6B7A94]">Prøveperiode utløper</p>
                              <p className="text-white">
                                {new Date(company.trialEndsAt).toLocaleDateString('nb-NO')}
                              </p>
                            </div>
                          )}
                          {company.createdAt && (
                            <div>
                              <p className="text-[#6B7A94]">Opprettet</p>
                              <p className="text-white">
                                {new Date(company.createdAt).toLocaleDateString('nb-NO')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Grant Access Buttons */}
                        <div className="flex gap-2 mb-4 pb-4 border-b border-white/[0.06]">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrantFreeMonth(company.id, company.businessName)}
                            disabled={grantingAccess === company.id}
                            className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
                          >
                            {grantingAccess === company.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Gift className="h-4 w-4 mr-1" />
                            )}
                            +1 måned gratis
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrantLifetime(company.id, company.businessName)}
                            disabled={grantingAccess === company.id}
                            className="text-botsy-lime border-botsy-lime/30 hover:bg-botsy-lime/10"
                          >
                            {grantingAccess === company.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Infinity className="h-4 w-4 mr-1" />
                            )}
                            Lifetime gratis
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncCompanyWebsite(company.id, company.businessName, company.websiteUrl)}
                            disabled={syncingCompany === company.id}
                            className="text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                          >
                            {syncingCompany === company.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Synk nettside
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestWidget(company.id, company.businessName)}
                            disabled={testingWidget === company.id}
                            className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                          >
                            {testingWidget === company.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-1" />
                            )}
                            Test widget
                          </Button>
                        </div>

                        {/* Widget test result */}
                        {widgetTestResult[company.id] && (
                          <div className={`mb-4 p-3 rounded-lg border ${
                            widgetTestResult[company.id].status === 'success' 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : widgetTestResult[company.id].status === 'setup'
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-red-500/10 border-red-500/30'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {widgetTestResult[company.id].status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : widgetTestResult[company.id].status === 'setup' ? (
                                <Loader2 className="h-4 w-4 text-amber-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400" />
                              )}
                              <span className={`text-sm font-medium ${
                                widgetTestResult[company.id].status === 'success' 
                                  ? 'text-green-400' 
                                  : widgetTestResult[company.id].status === 'setup'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}>
                                {widgetTestResult[company.id].status === 'success' 
                                  ? 'Widget fungerer!' 
                                  : widgetTestResult[company.id].status === 'setup'
                                  ? 'Setter opp...'
                                  : 'Widget feilet'}
                              </span>
                            </div>
                            <p className="text-[#6B7A94] text-xs">
                              {widgetTestResult[company.id].message}
                            </p>
                          </div>
                        )}

                        {/* Members list */}
                        {company.members.length > 0 && (
                          <div>
                            <p className="text-[#6B7A94] text-sm mb-2">Teammedlemmer</p>
                            <div className="space-y-2">
                              {company.members.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]"
                                >
                                  <div>
                                    <p className="text-white text-sm">
                                      {member.displayName || member.email || 'Ukjent'}
                                    </p>
                                    {member.displayName && member.email && (
                                      <p className="text-[#6B7A94] text-xs">{member.email}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        member.role === 'owner'
                                          ? 'text-botsy-lime border-botsy-lime/30'
                                          : member.role === 'admin'
                                          ? 'text-blue-400 border-blue-400/30'
                                          : 'text-[#6B7A94]'
                                      }
                                    >
                                      {member.role === 'owner'
                                        ? 'Eier'
                                        : member.role === 'admin'
                                        ? 'Admin'
                                        : 'Ansatt'}
                                    </Badge>
                                    {member.status !== 'active' && (
                                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                        {member.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!companiesData && !companiesLoading && (
            <p className="text-[#6B7A94] text-center py-8">
              Klikk &quot;Hent data&quot; for å se alle virksomheter og brukere
            </p>
          )}
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
