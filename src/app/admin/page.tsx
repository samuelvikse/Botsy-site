'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Settings,
  BarChart3,
  Users,
  Search,
  Plus,
  Filter,
  Clock,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  Zap,
  Bot,
  User,
  Phone,
  MessageCircle,
  ChevronRight,
  Menu,
  X,
  ListChecks,
  Code2,
  Sparkles,
  FileUp,
  Layers,
  Shield,
  Globe,
  Copy,
  EyeOff,
  Trash2,
  Edit,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, PermissionProvider } from '@/contexts/PermissionContext'
import { BotsyChatPanel } from '@/components/dashboard/BotsyChatPanel'
import { InstructionsView } from '@/components/dashboard/InstructionsView'
import { WidgetSettingsView } from '@/components/dashboard/WidgetSettingsView'
import { AnalyticsView } from '@/components/dashboard/AnalyticsView'
import { ConversationsView } from '@/components/dashboard/ConversationsView'
import { ToneConfigView } from '@/components/dashboard/ToneConfigView'
import { KnowledgeDocsView } from '@/components/dashboard/KnowledgeDocsView'
import { ChannelsView } from '@/components/dashboard/ChannelsView'
import SecuritySettingsView from '@/components/dashboard/SecuritySettingsView'
import { EmployeesView } from '@/components/dashboard/EmployeesView'
import { ProfileDropdown } from '@/components/dashboard/ProfileDropdown'
import { SimpleNotificationBell } from '@/components/ui/notification-panel'
import { ConfirmDialog, InputDialog, Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { saveInstruction } from '@/lib/firestore'
import type { BusinessProfile, Instruction } from '@/types'

type Tab = 'dashboard' | 'conversations' | 'knowledge' | 'documents' | 'instructions' | 'analytics' | 'widget' | 'channels' | 'tone' | 'security' | 'settings' | 'employees'

export default function AdminPanel() {
  return (
    <ProtectedRoute>
      <PermissionProvider>
        <AdminContent />
      </PermissionProvider>
    </ProtectedRoute>
  )
}

function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [widgetSettings, setWidgetSettings] = useState({
    primaryColor: '#CCFF00',
    position: 'bottom-right',
    greeting: 'Hei! 👋 Hvordan kan jeg hjelpe deg?',
    isEnabled: true,
    logoUrl: null as string | null,
    widgetSize: 'medium' as 'small' | 'medium' | 'large',
  })
  const { user, userData } = useAuth()
  const { hasAccess } = usePermissions()

  const companyId = userData?.companyId || user?.uid

  // Fetch business profile and instructions
  const fetchData = useCallback(async () => {
    if (!companyId || !db) return

    try {
      // Fetch company data with business profile and widget settings
      const companyDoc = await getDoc(doc(db, 'companies', companyId))
      if (companyDoc.exists()) {
        const data = companyDoc.data()
        if (data.businessProfile) {
          setBusinessProfile(data.businessProfile as BusinessProfile)
        }
        if (data.widgetSettings) {
          setWidgetSettings({
            primaryColor: data.widgetSettings.primaryColor || '#CCFF00',
            position: data.widgetSettings.position || 'bottom-right',
            greeting: data.widgetSettings.greeting || 'Hei! 👋 Hvordan kan jeg hjelpe deg?',
            isEnabled: data.widgetSettings.isEnabled ?? true,
            logoUrl: data.widgetSettings.logoUrl || null,
            widgetSize: data.widgetSettings.widgetSize || 'medium',
          })
        }
      }

      // Fetch instructions
      const instructionsRef = collection(db, 'companies', companyId, 'instructions')
      const instructionsQuery = query(
        instructionsRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      )
      const instructionsSnapshot = await getDocs(instructionsQuery)
      const instructionsData = instructionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        startsAt: doc.data().startsAt?.toDate() || null,
        expiresAt: doc.data().expiresAt?.toDate() || null,
      })) as Instruction[]
      setInstructions(instructionsData)
    } catch {
      // Silent fail - will show empty state
    }
  }, [companyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInstructionCreated = async (instruction: Instruction) => {
    if (!companyId) return

    try {
      // Save to Firestore
      const newId = await saveInstruction(companyId, {
        content: instruction.content,
        category: instruction.category,
        priority: instruction.priority,
        isActive: instruction.isActive,
        startsAt: instruction.startsAt,
        expiresAt: instruction.expiresAt,
        createdAt: new Date(),
        createdBy: user?.displayName || user?.email || 'Botsy Chat',
      })

      // Add to local state with the new ID
      setInstructions(prev => [{ ...instruction, id: newId }, ...prev])
    } catch (error) {
      console.error('Failed to save instruction:', error)
    }
  }

  return (
    <div className="h-screen bg-botsy-dark flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Fixed on all screen sizes */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-botsy-dark-deep border-r border-white/[0.06] flex flex-col transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/[0.06] flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={110}
              height={36}
              className="h-8 w-auto"
            />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {hasAccess('dashboard') && (
            <NavItem
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('conversations') && (
            <NavItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Samtaler"
              active={activeTab === 'conversations'}
              onClick={() => { setActiveTab('conversations'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('knowledge') && (
            <NavItem
              icon={<BookOpen className="h-5 w-5" />}
              label="Kunnskapsbase"
              active={activeTab === 'knowledge'}
              onClick={() => { setActiveTab('knowledge'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('documents') && (
            <NavItem
              icon={<FileUp className="h-5 w-5" />}
              label="Dokumenter"
              active={activeTab === 'documents'}
              onClick={() => { setActiveTab('documents'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('instructions') && (
            <NavItem
              icon={<ListChecks className="h-5 w-5" />}
              label="Instruksjoner"
              active={activeTab === 'instructions'}
              onClick={() => { setActiveTab('instructions'); setSidebarOpen(false); }}
              badge={instructions.length > 0 ? instructions.length : undefined}
            />
          )}
          {hasAccess('widget') && (
            <NavItem
              icon={<Code2 className="h-5 w-5" />}
              label="Widget"
              active={activeTab === 'widget'}
              onClick={() => { setActiveTab('widget'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('tone') && (
            <NavItem
              icon={<Sparkles className="h-5 w-5" />}
              label="Tone-konfigurasjon"
              active={activeTab === 'tone'}
              onClick={() => { setActiveTab('tone'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('channels') && (
            <NavItem
              icon={<Layers className="h-5 w-5" />}
              label="Kanaler"
              active={activeTab === 'channels'}
              onClick={() => { setActiveTab('channels'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('analytics') && (
            <NavItem
              icon={<BarChart3 className="h-5 w-5" />}
              label="Analyser"
              active={activeTab === 'analytics'}
              onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('employees') && (
            <NavItem
              icon={<Users className="h-5 w-5" />}
              label="Ansatte"
              active={activeTab === 'employees'}
              onClick={() => { setActiveTab('employees'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('security') && (
            <NavItem
              icon={<Shield className="h-5 w-5" />}
              label="Sikkerhet"
              active={activeTab === 'security'}
              onClick={() => { setActiveTab('security'); setSidebarOpen(false); }}
            />
          )}
          {hasAccess('settings') && (
            <NavItem
              icon={<Settings className="h-5 w-5" />}
              label="Innstillinger"
              active={activeTab === 'settings'}
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
            />
          )}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
          <ProfileDropdown onNavigateToSettings={() => { setActiveTab('settings'); setSidebarOpen(false); }} />
        </div>
      </aside>

      {/* Main Content - Add left margin for fixed sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6 bg-botsy-dark-deep/50">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-white hover:bg-white/[0.05] rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
              <input
                type="text"
                placeholder="Søk..."
                className="h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SimpleNotificationBell />
            <Button size="sm" onClick={() => setActiveTab('knowledge')}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ny FAQ
            </Button>
          </div>
        </header>

        {/* Page Content - Scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTab === 'dashboard' && companyId && <DashboardView companyId={companyId} onViewAllConversations={() => setActiveTab('conversations')} />}
          {activeTab === 'conversations' && companyId && <ConversationsView companyId={companyId} />}
          {activeTab === 'knowledge' && companyId && <KnowledgeBaseView companyId={companyId} />}
          {activeTab === 'documents' && companyId && (
            <KnowledgeDocsView companyId={companyId} userId={user?.uid} />
          )}
          {activeTab === 'instructions' && companyId && (
            <InstructionsView
              companyId={companyId}
              instructions={instructions}
              onInstructionsChange={fetchData}
            />
          )}
          {activeTab === 'widget' && companyId && (
            <WidgetSettingsView
              companyId={companyId}
              initialSettings={widgetSettings}
              businessName={businessProfile?.businessName}
            />
          )}
          {activeTab === 'analytics' && companyId && (
            <AnalyticsView companyId={companyId} />
          )}
          {activeTab === 'channels' && companyId && (
            <ChannelsView companyId={companyId} />
          )}
          {activeTab === 'tone' && companyId && (
            <ToneConfigView companyId={companyId} initialProfile={businessProfile} />
          )}
          {activeTab === 'employees' && companyId && <EmployeesView companyId={companyId} />}
          {activeTab === 'security' && <SecuritySettingsView />}
          {activeTab === 'settings' && companyId && <SettingsView companyId={companyId} onNavigateToChannels={() => setActiveTab('channels')} />}
        </main>
      </div>

      {/* Botsy Chat Panel */}
      <BotsyChatPanel
        companyId={companyId}
        businessProfile={businessProfile}
        instructions={instructions}
        onInstructionCreated={handleInstructionCreated}
      />
    </div>
  )
}

// Navigation Item Component
function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-botsy-lime/10 text-botsy-lime'
          : 'text-[#A8B4C8] hover:text-white hover:bg-white/[0.03]'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="h-5 min-w-5 px-1.5 bg-botsy-lime text-botsy-dark text-xs font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

// Dashboard View
function DashboardView({ companyId, onViewAllConversations }: { companyId: string; onViewAllConversations: () => void }) {
  const [stats, setStats] = useState<{
    totalConversations: number
    conversationsToday: number
    smsCount: number
    widgetCount: number
    emailCount: number
    totalMessages: number
    recentConversations: Array<{
      id: string
      name: string
      phone?: string
      email?: string
      channel: 'sms' | 'widget' | 'email'
      lastMessage: string
      lastMessageAt: Date
    }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { getDashboardStats } = await import('@/lib/sms-firestore')
        const dashboardStats = await getDashboardStats(companyId)
        setStats(dashboardStats)
      } catch {
        // Silent fail - will show empty state
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [companyId])

  const totalChannels = (stats?.smsCount || 0) + (stats?.widgetCount || 0) + (stats?.emailCount || 0)
  const smsPercentage = totalChannels > 0 ? Math.round((stats?.smsCount || 0) / totalChannels * 100) : 0
  const widgetPercentage = totalChannels > 0 ? Math.round((stats?.widgetCount || 0) / totalChannels * 100) : 0
  const emailPercentage = totalChannels > 0 ? Math.round((stats?.emailCount || 0) / totalChannels * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-[#6B7A94]">Oversikt over Botsy sin aktivitet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Samtaler i dag"
          value={isLoading ? '...' : String(stats?.conversationsToday || 0)}
          change=""
          trend="up"
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          title="Totale samtaler"
          value={isLoading ? '...' : String(stats?.totalConversations || 0)}
          change=""
          trend="up"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          title="Totale meldinger"
          value={isLoading ? '...' : String(stats?.totalMessages || 0)}
          change=""
          trend="up"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Aktive kanaler"
          value={isLoading ? '...' : String(((stats?.smsCount || 0) > 0 ? 1 : 0) + ((stats?.widgetCount || 0) > 0 ? 1 : 0) + ((stats?.emailCount || 0) > 0 ? 1 : 0))}
          change=""
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Recent Conversations & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Nylige samtaler</h2>
            <Button variant="ghost" size="sm" onClick={onViewAllConversations}>
              Se alle
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-[#6B7A94] text-sm">Laster...</div>
            ) : stats?.recentConversations.length === 0 ? (
              <div className="text-[#6B7A94] text-sm">Ingen samtaler ennå</div>
            ) : (
              stats?.recentConversations.slice(0, 4).map((conv) => (
                <ConversationPreview
                  key={conv.id}
                  name={conv.name}
                  message={conv.lastMessage}
                  time={formatTimeAgo(conv.lastMessageAt)}
                  channel={conv.channel}
                  status="resolved"
                />
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Aktivitet</h2>
          <div className="space-y-4">
            <ActivityItem
              icon={<Bot className="h-4 w-4" />}
              text={`${stats?.totalMessages || 0} meldinger totalt`}
              time="Alle kanaler"
            />
            <ActivityItem
              icon={<User className="h-4 w-4" />}
              text={`${stats?.conversationsToday || 0} samtaler i dag`}
              time="I dag"
            />
            <ActivityItem
              icon={<Phone className="h-4 w-4" />}
              text={`${stats?.smsCount || 0} SMS-samtaler`}
              time="Totalt"
            />
            <ActivityItem
              icon={<MessageCircle className="h-4 w-4" />}
              text={`${stats?.widgetCount || 0} widget-samtaler`}
              time="Totalt"
            />
          </div>
        </Card>
      </div>

      {/* Channel Stats */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Samtaler per kanal</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ChannelStat channel="SMS" count={stats?.smsCount || 0} percentage={smsPercentage} color="#CDFF4D" />
          <ChannelStat channel="Widget" count={stats?.widgetCount || 0} percentage={widgetPercentage} color="#3B82F6" />
          <ChannelStat channel="WhatsApp" count={0} percentage={0} color="#25D366" />
          <ChannelStat channel="E-post" count={stats?.emailCount || 0} percentage={emailPercentage} color="#EA4335" />
        </div>
      </Card>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Nå'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`
  if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'er' : ''} siden`

  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

// Knowledge Base View
function KnowledgeBaseView({ companyId }: { companyId: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string; source: string; confirmed: boolean }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; question: string; answer: string } | null>(null)
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })
  const toast = useToast()

  // Load FAQs on mount
  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const { getFAQs } = await import('@/lib/firestore')
        const loadedFaqs = await getFAQs(companyId)
        setFaqs(loadedFaqs)
      } catch {
        toast.error('Kunne ikke laste FAQs', 'Prøv å laste siden på nytt')
      } finally {
        setIsLoading(false)
      }
    }
    loadFaqs()
  }, [companyId, toast])

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleDeleteFaq = (id: string) => {
    setDeleteTarget(id)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (deleteTarget) {
      setIsSaving(true)
      try {
        const { deleteFAQ } = await import('@/lib/firestore')
        await deleteFAQ(companyId, deleteTarget)
        setFaqs(faqs.filter(faq => faq.id !== deleteTarget))
        toast.success('FAQ slettet', 'FAQ-en ble fjernet fra kunnskapsbasen')
      } catch {
        toast.error('Kunne ikke slette', 'Prøv igjen senere')
      } finally {
        setIsSaving(false)
      }
    }
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  const handleEditFaq = (id: string) => {
    const faq = faqs.find(f => f.id === id)
    if (faq) {
      setEditTarget({ id: faq.id, question: faq.question, answer: faq.answer })
      setEditModalOpen(true)
    }
  }

  const confirmEdit = async () => {
    if (editTarget) {
      setIsSaving(true)
      try {
        const { updateFAQ } = await import('@/lib/firestore')
        await updateFAQ(companyId, editTarget.id, {
          question: editTarget.question,
          answer: editTarget.answer,
        })
        setFaqs(faqs.map(f => f.id === editTarget.id ? { ...f, question: editTarget.question, answer: editTarget.answer } : f))
        toast.success('FAQ oppdatert', 'Endringene ble lagret')
      } catch {
        toast.error('Kunne ikke oppdatere', 'Prøv igjen senere')
      } finally {
        setIsSaving(false)
      }
    }
    setEditModalOpen(false)
    setEditTarget(null)
  }

  const handleAddFaq = () => {
    setNewFaq({ question: '', answer: '' })
    setAddModalOpen(true)
  }

  const confirmAdd = async () => {
    if (newFaq.question && newFaq.answer) {
      setIsSaving(true)
      try {
        const { addFAQ } = await import('@/lib/firestore')
        const newFaqData = {
          id: `faq-${Date.now()}`,
          question: newFaq.question,
          answer: newFaq.answer,
          source: 'user' as const,
          confirmed: true,
        }
        await addFAQ(companyId, newFaqData)
        setFaqs([...faqs, newFaqData])
        toast.success('FAQ lagt til', 'Den nye FAQ-en ble lagt til i kunnskapsbasen')
        setAddModalOpen(false)
      } catch {
        toast.error('Kunne ikke legge til', 'Prøv igjen senere')
      } finally {
        setIsSaving(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#6B7A94]">Laster FAQs...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Kunnskapsbase</h1>
          <p className="text-[#6B7A94]">Administrer FAQs og informasjon Botsy bruker</p>
        </div>
        <Button onClick={handleAddFaq}>
          <Plus className="h-4 w-4 mr-1.5" />
          Legg til FAQ
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
          <input
            type="text"
            placeholder="Søk i kunnskapsbasen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
          <Filter className="h-4 w-4 mr-1.5" />
          Nullstill
        </Button>
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[#6B7A94]">Ingen FAQs funnet</p>
          </Card>
        ) : (
          filteredFaqs.map((faq) => (
            <Card key={faq.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{faq.source === 'user' ? 'Manuell' : faq.source === 'generated' ? 'Generert' : 'Ekstrahert'}</Badge>
                    {faq.confirmed && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Bekreftet</Badge>}
                  </div>
                  <h3 className="text-white font-medium mb-2">{faq.question}</h3>
                  <p className="text-[#A8B4C8] text-sm">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditFaq(faq.id)}
                    className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg"
                    title="Rediger"
                    disabled={isSaving}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-2 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    title="Slett"
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Slett FAQ?"
        description="Er du sikker på at du vil slette denne FAQ-en? Dette kan ikke angres."
        confirmText="Slett"
        variant="danger"
      />

      {/* Add FAQ Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Legg til ny FAQ" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-white text-sm font-medium block mb-2">Spørsmål</label>
            <input
              type="text"
              value={newFaq.question}
              onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
              placeholder="Hva vil kunder ofte spørre om?"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
            />
          </div>
          <div>
            <label className="text-white text-sm font-medium block mb-2">Svar</label>
            <textarea
              rows={3}
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
              placeholder="Skriv svaret Botsy skal gi..."
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)} className="flex-1">
              Avbryt
            </Button>
            <Button onClick={confirmAdd} disabled={!newFaq.question || !newFaq.answer || isSaving} className="flex-1">
              {isSaving ? 'Legger til...' : 'Legg til FAQ'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit FAQ Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Rediger FAQ" size="md">
        {editTarget && (
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium block mb-2">Spørsmål</label>
              <input
                type="text"
                value={editTarget.question}
                onChange={(e) => setEditTarget({ ...editTarget, question: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
              />
            </div>
            <div>
              <label className="text-white text-sm font-medium block mb-2">Svar</label>
              <textarea
                rows={3}
                value={editTarget.answer}
                onChange={(e) => setEditTarget({ ...editTarget, answer: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} className="flex-1">
                Avbryt
              </Button>
              <Button onClick={confirmEdit} disabled={!editTarget.question || !editTarget.answer || isSaving} className="flex-1">
                {isSaving ? 'Lagrer...' : 'Lagre endringer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Settings View
const LANGUAGE_OPTIONS = [
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
]

function SettingsView({ companyId, onNavigateToChannels }: { companyId: string; onNavigateToChannels: () => void }) {
  const [settings, setSettings] = useState({
    botName: 'Botsy',
    emailNotifications: true,
    dailySummary: false,
  })
  const [language, setLanguage] = useState('no')
  const [languageName, setLanguageName] = useState('Norsk')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(false)
  const [showCompanyId, setShowCompanyId] = useState(false)
  const toast = useToast()

  const handleCopyCompanyId = async () => {
    try {
      await navigator.clipboard.writeText(companyId)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch {
      toast.error('Kunne ikke kopiere', 'Prøv å markere teksten manuelt')
    }
  }

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getGeneralSettings, getBusinessProfile } = await import('@/lib/firestore')
        const savedSettings = await getGeneralSettings(companyId)
        setSettings(savedSettings)

        // Load language from business profile
        const profile = await getBusinessProfile(companyId)
        if (profile?.language) {
          setLanguage(profile.language)
        }
        if (profile?.languageName) {
          setLanguageName(profile.languageName)
        }
      } catch {
        // Silent fail - will use defaults
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [companyId])

  const handleToggle = (key: 'emailNotifications' | 'dailySummary') => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleLanguageChange = (code: string) => {
    const selectedLang = LANGUAGE_OPTIONS.find(l => l.code === code)
    if (selectedLang) {
      setLanguage(selectedLang.code)
      setLanguageName(selectedLang.name)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { saveGeneralSettings, saveToneConfig } = await import('@/lib/firestore')
      await saveGeneralSettings(companyId, settings)
      // Save language to businessProfile
      await saveToneConfig(companyId, { language, languageName })
      toast.success('Innstillinger lagret', 'Endringene dine ble lagret')
    } catch {
      toast.error('Kunne ikke lagre', 'Prøv igjen senere')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#6B7A94]">Laster innstillinger...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Innstillinger</h1>
        <p className="text-[#6B7A94]">Konfigurer Botsy og kontoen din</p>
      </div>

      {/* Company ID */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="h-5 w-5 text-botsy-lime" />
          <h2 className="text-lg font-semibold text-white">Bedrifts-ID</h2>
        </div>
        <p className="text-[#6B7A94] text-sm mb-4">
          Denne ID-en brukes til å koble widgeten til nettsiden din og andre integrasjoner.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-3 bg-black/30 rounded-xl font-mono text-sm border border-white/[0.06] select-none">
            {showCompanyId ? (
              <span className="text-botsy-lime">{companyId}</span>
            ) : (
              <span className="text-[#6B7A94]">••••••••••••••••••••</span>
            )}
          </code>
          <button
            onClick={() => setShowCompanyId(!showCompanyId)}
            className="p-3 rounded-xl border bg-white/[0.03] border-white/[0.06] text-[#6B7A94] hover:text-white hover:border-white/[0.12] transition-all"
            title={showCompanyId ? 'Skjul' : 'Vis'}
          >
            {showCompanyId ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          <button
            onClick={handleCopyCompanyId}
            className={`p-3 rounded-xl border transition-all ${
              copiedId
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-white/[0.03] border-white/[0.06] text-[#6B7A94] hover:text-white hover:border-white/[0.12]'
            }`}
            title="Kopier"
          >
            {copiedId ? <CheckCheck className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </Card>

      {/* Bot Name */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Chatbot</h2>
        <div className="space-y-6">
          <div>
            <label className="text-white text-sm font-medium block mb-2">Botsys navn</label>
            <input
              type="text"
              value={settings.botName}
              onChange={(e) => setSettings(prev => ({ ...prev, botName: e.target.value }))}
              className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
            />
            <p className="text-[#6B7A94] text-xs mt-2">Dette navnet brukes internt i dashbordet</p>
          </div>

          {/* Language Selection */}
          <div>
            <label className="text-white text-sm font-medium flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-botsy-lime" />
              Robotens hovedspråk
            </label>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    language === lang.code
                      ? 'border-botsy-lime bg-botsy-lime/10'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <span className="text-lg mb-1 block">{lang.flag}</span>
                  <p className={`text-xs font-medium ${language === lang.code ? 'text-botsy-lime' : 'text-white'}`}>
                    {lang.name}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[#6B7A94] text-xs mt-2">
              Robotens standardspråk. Hvis kunden skriver på et annet språk, bytter roboten automatisk til kundens språk.
            </p>
          </div>
        </div>
      </Card>

      {/* Channels */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Tilkoblede kanaler</h2>
          <Button size="sm" onClick={onNavigateToChannels}>
            <Layers className="h-4 w-4 mr-1.5" />
            Administrer kanaler
          </Button>
        </div>
        <p className="text-[#6B7A94] text-sm">
          Koble til WhatsApp, Messenger, SMS og E-post for å la Botsy svare kunder på alle plattformer.
        </p>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Varsler</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">E-postvarsler</p>
              <p className="text-[#6B7A94] text-sm">Få varsel ved eskalerte samtaler</p>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.emailNotifications ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${settings.emailNotifications ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Daglig oppsummering</p>
              <p className="text-[#6B7A94] text-sm">Motta daglig rapport på e-post</p>
            </div>
            <button
              onClick={() => handleToggle('dailySummary')}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.dailySummary ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${settings.dailySummary ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Lagrer...' : 'Lagre endringer'}
        </Button>
      </div>
    </div>
  )
}

// Helper Components
function StatCard({ title, value, change, trend, icon }: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl bg-botsy-lime/10 flex items-center justify-center text-botsy-lime">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {change}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-[#6B7A94] text-sm">{title}</p>
    </Card>
  )
}

function ConversationPreview({ name, message, time, channel, status }: {
  name: string
  message: string
  time: string
  channel: 'whatsapp' | 'messenger' | 'sms' | 'email' | 'widget'
  status: 'resolved' | 'pending' | 'escalated'
}) {
  const channelColors = {
    whatsapp: '#25D366',
    messenger: '#0084FF',
    sms: '#CDFF4D',
    email: '#EA4335',
    widget: '#3B82F6'
  }

  const statusConfig = {
    resolved: { color: 'text-green-400', icon: <CheckCheck className="h-4 w-4" /> },
    pending: { color: 'text-yellow-400', icon: <Clock className="h-4 w-4" /> },
    escalated: { color: 'text-red-400', icon: <AlertCircle className="h-4 w-4" /> }
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
      <div className="h-10 w-10 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium text-sm">
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white font-medium text-sm">{name}</p>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: channelColors[channel] }} />
        </div>
        <p className="text-[#6B7A94] text-sm truncate">{message}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[#6B7A94] text-xs mb-1">{time}</p>
        <span className={statusConfig[status].color}>{statusConfig[status].icon}</span>
      </div>
    </div>
  )
}

function ActivityItem({ icon, text, time }: {
  icon: React.ReactNode
  text: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-[#A8B4C8] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-white text-sm">{text}</p>
        <p className="text-[#6B7A94] text-xs">{time}</p>
      </div>
    </div>
  )
}

function ChannelStat({ channel, count, percentage, color }: {
  channel: string
  count: number
  percentage: number
  color: string
}) {
  return (
    <div className="p-4 bg-white/[0.02] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-medium">{channel}</p>
        <span className="text-[#6B7A94] text-sm">{percentage}%</span>
      </div>
      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[#6B7A94] text-sm">{count} meldinger</p>
    </div>
  )
}

function ChatMessage({ sender, message, time }: {
  sender: 'customer' | 'bot'
  message: string
  time: string
}) {
  return (
    <div className={`flex ${sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] ${sender === 'bot' ? 'order-1' : 'order-2'}`}>
        <div className={`p-3 rounded-2xl ${
          sender === 'bot'
            ? 'bg-white/[0.05] text-white rounded-bl-md'
            : 'bg-botsy-lime text-botsy-dark rounded-br-md'
        }`}>
          <p className="text-sm">{message}</p>
        </div>
        <p className={`text-[#6B7A94] text-xs mt-1 ${sender === 'bot' ? 'text-left' : 'text-right'}`}>
          {sender === 'bot' && <Bot className="h-3 w-3 inline mr-1" />}
          {time}
        </p>
      </div>
    </div>
  )
}

