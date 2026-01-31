'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Settings,
  BarChart3,
  Users,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Plus,
  Filter,
  MoreHorizontal,
  Send,
  Paperclip,
  Clock,
  CheckCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Bot,
  User,
  Phone,
  Mail,
  MessageCircle,
  ArrowUpRight,
  Calendar,
  FileText,
  Trash2,
  Edit,
  Eye,
  ChevronRight,
  Menu,
  X,
  ListChecks,
  Code2,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { BotsyChatPanel } from '@/components/dashboard/BotsyChatPanel'
import { InstructionsView } from '@/components/dashboard/InstructionsView'
import { WidgetSettingsView } from '@/components/dashboard/WidgetSettingsView'
import { AnalyticsView } from '@/components/dashboard/AnalyticsView'
import { SMSSettingsView } from '@/components/dashboard/SMSSettingsView'
import { ConversationsView } from '@/components/dashboard/ConversationsView'
import { ToneConfigView } from '@/components/dashboard/ToneConfigView'
import { SimpleNotificationBell } from '@/components/ui/notification-panel'
import { ConfirmDialog, InputDialog, Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BusinessProfile, Instruction } from '@/types'

type Tab = 'dashboard' | 'conversations' | 'knowledge' | 'instructions' | 'analytics' | 'widget' | 'sms' | 'tone' | 'settings'

export default function AdminPanel() {
  return (
    <ProtectedRoute>
      <AdminContent />
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
  })
  const { user, userData, signOut } = useAuth()
  const router = useRouter()

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
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [companyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleInstructionCreated = (instruction: Instruction) => {
    setInstructions(prev => [instruction, ...prev])
  }

  // Get user initials
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-botsy-dark flex">
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

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-botsy-dark-deep border-r border-white/[0.06] flex flex-col transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/[0.06]">
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

        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
          />
          <NavItem
            icon={<MessageSquare className="h-5 w-5" />}
            label="Samtaler"
            active={activeTab === 'conversations'}
            onClick={() => { setActiveTab('conversations'); setSidebarOpen(false); }}
            badge={3}
          />
          <NavItem
            icon={<BookOpen className="h-5 w-5" />}
            label="Kunnskapsbase"
            active={activeTab === 'knowledge'}
            onClick={() => { setActiveTab('knowledge'); setSidebarOpen(false); }}
          />
          <NavItem
            icon={<ListChecks className="h-5 w-5" />}
            label="Instruksjoner"
            active={activeTab === 'instructions'}
            onClick={() => { setActiveTab('instructions'); setSidebarOpen(false); }}
            badge={instructions.length > 0 ? instructions.length : undefined}
          />
          <NavItem
            icon={<Code2 className="h-5 w-5" />}
            label="Widget"
            active={activeTab === 'widget'}
            onClick={() => { setActiveTab('widget'); setSidebarOpen(false); }}
          />
          <NavItem
            icon={<Sparkles className="h-5 w-5" />}
            label="Tone-konfigurasjon"
            active={activeTab === 'tone'}
            onClick={() => { setActiveTab('tone'); setSidebarOpen(false); }}
          />
          <NavItem
            icon={<Phone className="h-5 w-5" />}
            label="SMS"
            active={activeTab === 'sms'}
            onClick={() => { setActiveTab('sms'); setSidebarOpen(false); }}
          />
          <NavItem
            icon={<BarChart3 className="h-5 w-5" />}
            label="Analyser"
            active={activeTab === 'analytics'}
            onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
          />
          <NavItem
            icon={<Settings className="h-5 w-5" />}
            label="Innstillinger"
            active={activeTab === 'settings'}
            onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
          />
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors group">
            <div className="h-9 w-9 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-medium text-sm">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.displayName || 'Bruker'}</p>
              <p className="text-[#6B7A94] text-xs truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Logg ut"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
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

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {activeTab === 'dashboard' && companyId && <DashboardView companyId={companyId} onViewAllConversations={() => setActiveTab('conversations')} />}
          {activeTab === 'conversations' && companyId && <ConversationsView companyId={companyId} />}
          {activeTab === 'knowledge' && <KnowledgeBaseView />}
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
          {activeTab === 'sms' && companyId && (
            <SMSSettingsView companyId={companyId} />
          )}
          {activeTab === 'tone' && companyId && (
            <ToneConfigView companyId={companyId} initialProfile={businessProfile} />
          )}
          {activeTab === 'settings' && <SettingsView />}
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
    totalMessages: number
    recentConversations: Array<{
      id: string
      name: string
      phone?: string
      channel: 'sms' | 'widget'
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
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [companyId])

  const totalChannels = (stats?.smsCount || 0) + (stats?.widgetCount || 0)
  const smsPercentage = totalChannels > 0 ? Math.round((stats?.smsCount || 0) / totalChannels * 100) : 0
  const widgetPercentage = totalChannels > 0 ? Math.round((stats?.widgetCount || 0) / totalChannels * 100) : 0

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
          value={isLoading ? '...' : String(((stats?.smsCount || 0) > 0 ? 1 : 0) + ((stats?.widgetCount || 0) > 0 ? 1 : 0))}
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
          <ChannelStat channel="E-post" count={0} percentage={0} color="#EA4335" />
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
function KnowledgeBaseView() {
  const [activeCategory, setActiveCategory] = useState('Alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [faqs, setFaqs] = useState([
    { id: 1, question: 'Hva er åpningstidene?', answer: 'Vi har åpent mandag-fredag 09-17, lørdag 10-16.', category: 'Generelt', usageCount: 234 },
    { id: 2, question: 'Hvordan returnerer jeg et produkt?', answer: 'Du kan returnere produkter innen 30 dager...', category: 'Retur', usageCount: 189 },
    { id: 3, question: 'Hva er leveringstiden?', answer: 'Normal leveringstid er 2-4 virkedager...', category: 'Levering', usageCount: 156 },
    { id: 4, question: 'Tilbyr dere montering?', answer: 'Ja, vi tilbyr monteringstjenester for de fleste produkter...', category: 'Tjenester', usageCount: 98 },
  ])

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: number; question: string; answer: string; category: string } | null>(null)
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'Generelt' })
  const toast = useToast()

  const categories = ['Alle', 'Generelt', 'Retur', 'Levering', 'Tjenester', 'Priser']

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'Alle' || faq.category === activeCategory
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleDeleteFaq = (id: number) => {
    setDeleteTarget(id)
    setDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      setFaqs(faqs.filter(faq => faq.id !== deleteTarget))
      toast.success('FAQ slettet', 'FAQ-en ble fjernet fra kunnskapsbasen')
    }
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  const handleEditFaq = (id: number) => {
    const faq = faqs.find(f => f.id === id)
    if (faq) {
      setEditTarget({ id: faq.id, question: faq.question, answer: faq.answer, category: faq.category })
      setEditModalOpen(true)
    }
  }

  const confirmEdit = () => {
    if (editTarget) {
      setFaqs(faqs.map(f => f.id === editTarget.id ? { ...f, question: editTarget.question, answer: editTarget.answer, category: editTarget.category } : f))
      toast.success('FAQ oppdatert', 'Endringene ble lagret')
    }
    setEditModalOpen(false)
    setEditTarget(null)
  }

  const handleAddFaq = () => {
    setNewFaq({ question: '', answer: '', category: 'Generelt' })
    setAddModalOpen(true)
  }

  const confirmAdd = () => {
    if (newFaq.question && newFaq.answer) {
      setFaqs([...faqs, {
        id: Date.now(),
        question: newFaq.question,
        answer: newFaq.answer,
        category: newFaq.category,
        usageCount: 0
      }])
      toast.success('FAQ lagt til', 'Den nye FAQ-en ble lagt til i kunnskapsbasen')
      setAddModalOpen(false)
    }
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

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-botsy-lime/10 text-botsy-lime'
                : 'bg-white/[0.03] text-[#A8B4C8] hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
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
                    <Badge variant="secondary">{faq.category}</Badge>
                    <span className="text-[#6B7A94] text-xs">Brukt {faq.usageCount} ganger</span>
                  </div>
                  <h3 className="text-white font-medium mb-2">{faq.question}</h3>
                  <p className="text-[#A8B4C8] text-sm">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditFaq(faq.id)}
                    className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg"
                    title="Rediger"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-2 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    title="Slett"
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
          <div>
            <label className="text-white text-sm font-medium block mb-2">Kategori</label>
            <select
              value={newFaq.category}
              onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
            >
              {categories.filter(c => c !== 'Alle').map((cat) => (
                <option key={cat} value={cat} className="bg-[#1a1a2e]">{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)} className="flex-1">
              Avbryt
            </Button>
            <Button onClick={confirmAdd} disabled={!newFaq.question || !newFaq.answer} className="flex-1">
              Legg til FAQ
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
            <div>
              <label className="text-white text-sm font-medium block mb-2">Kategori</label>
              <select
                value={editTarget.category}
                onChange={(e) => setEditTarget({ ...editTarget, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
              >
                {categories.filter(c => c !== 'Alle').map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1a1a2e]">{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} className="flex-1">
                Avbryt
              </Button>
              <Button onClick={confirmEdit} disabled={!editTarget.question || !editTarget.answer} className="flex-1">
                Lagre endringer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Settings View
function SettingsView() {
  const [settings, setSettings] = useState({
    botName: 'Botsy',
    tone: 'Vennlig og uformell',
    greeting: 'Hei! Jeg er Botsy, din digitale assistent. Hvordan kan jeg hjelpe deg i dag?',
    useEmojis: true,
    emailNotifications: true,
    dailySummary: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToast()

  const handleToggle = (key: 'useEmojis' | 'emailNotifications' | 'dailySummary') => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaving(false)
    toast.success('Innstillinger lagret', 'Endringene dine ble lagret')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Innstillinger</h1>
        <p className="text-[#6B7A94]">Konfigurer Botsy og kontoen din</p>
      </div>

      {/* Personality Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Botsys personlighet</h2>
        <div className="space-y-6">
          <div>
            <label className="text-white text-sm font-medium block mb-2">Navn</label>
            <input
              type="text"
              value={settings.botName}
              onChange={(e) => setSettings(prev => ({ ...prev, botName: e.target.value }))}
              className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
            />
          </div>
          <div>
            <label className="text-white text-sm font-medium block mb-2">Tone</label>
            <select
              value={settings.tone}
              onChange={(e) => setSettings(prev => ({ ...prev, tone: e.target.value }))}
              className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
            >
              <option>Vennlig og uformell</option>
              <option>Profesjonell og formell</option>
              <option>Blanding</option>
            </select>
          </div>
          <div>
            <label className="text-white text-sm font-medium block mb-2">Velkomstmelding</label>
            <textarea
              rows={3}
              value={settings.greeting}
              onChange={(e) => setSettings(prev => ({ ...prev, greeting: e.target.value }))}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Bruk emojis</p>
              <p className="text-[#6B7A94] text-sm">La Botsy bruke emojis i svar</p>
            </div>
            <button
              onClick={() => handleToggle('useEmojis')}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.useEmojis ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${settings.useEmojis ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Channels */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Tilkoblede kanaler</h2>
        <div className="space-y-4">
          <ChannelToggle name="WhatsApp" connected={true} color="#25D366" />
          <ChannelToggle name="Messenger" connected={true} color="#0084FF" />
          <ChannelToggle name="SMS" connected={false} color="#CDFF4D" />
          <ChannelToggle name="E-post" connected={false} color="#EA4335" />
        </div>
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

function ChannelToggle({ name, connected, color }: {
  name: string
  connected: boolean
  color: string
}) {
  const [isConnected, setIsConnected] = useState(connected)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState(false)
  const toast = useToast()

  const handleToggle = () => {
    if (name === 'SMS') {
      setShowSmsModal(true)
      return
    }
    if (isConnected) {
      setShowDisconnectModal(true)
    } else {
      setShowComingSoonModal(true)
    }
  }

  const confirmDisconnect = () => {
    setIsConnected(false)
    setShowDisconnectModal(false)
    toast.success(`${name} frakoblet`, 'Integrasjonen ble deaktivert')
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          </div>
          <div>
            <p className="text-white font-medium">{name}</p>
            <p className="text-[#6B7A94] text-sm">{isConnected ? 'Tilkoblet' : 'Ikke tilkoblet'}</p>
          </div>
        </div>
        <Button variant={isConnected ? 'outline' : 'default'} size="sm" onClick={handleToggle}>
          {isConnected ? 'Koble fra' : 'Koble til'}
        </Button>
      </div>

      {/* Disconnect Confirmation */}
      <ConfirmDialog
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={confirmDisconnect}
        title={`Koble fra ${name}?`}
        description={`Er du sikker på at du vil deaktivere ${name}-integrasjonen? Du kan koble til igjen senere.`}
        confirmText="Koble fra"
        variant="warning"
      />

      {/* Coming Soon Modal */}
      <Modal isOpen={showComingSoonModal} onClose={() => setShowComingSoonModal(false)} size="sm">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-botsy-lime/10 border border-botsy-lime/20 flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-botsy-lime" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Kommer snart!</h3>
          <p className="text-[#A8B4C8] text-sm mb-6">
            {name}-integrasjon er under utvikling og kommer snart. Vi gir deg beskjed når den er klar!
          </p>
          <Button onClick={() => setShowComingSoonModal(false)} className="w-full">
            Supert, jeg venter!
          </Button>
        </div>
      </Modal>

      {/* SMS Info Modal */}
      <Modal isOpen={showSmsModal} onClose={() => setShowSmsModal(false)} size="sm">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-[#CDFF4D]/10 border border-[#CDFF4D]/20 flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-[#CDFF4D]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">SMS-integrasjon</h3>
          <p className="text-[#A8B4C8] text-sm mb-6">
            Gå til SMS-fanen i sidemenyen for å konfigurere SMS-integrasjonen med ditt telefonnummer.
          </p>
          <Button onClick={() => setShowSmsModal(false)} className="w-full">
            Forstått
          </Button>
        </div>
      </Modal>
    </>
  )
}
