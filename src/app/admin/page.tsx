'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
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
  Loader2,
  RefreshCw,
  HandHelping,
  Mail,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, PermissionProvider } from '@/contexts/PermissionContext'
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext'
import { FloatingSaveButton } from '@/components/dashboard/FloatingSaveButton'
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
        <UnsavedChangesProvider>
          <AdminContent />
          <FloatingSaveButton />
        </UnsavedChangesProvider>
      </PermissionProvider>
    </ProtectedRoute>
  )
}

function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [widgetSettings, setWidgetSettings] = useState({
    primaryColor: '#CCFF00',
    position: 'bottom-right',
    greeting: 'Hei! Hvordan kan jeg hjelpe deg?',
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
            greeting: data.widgetSettings.greeting || 'Hei! Hvordan kan jeg hjelpe deg?',
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
        <div className="px-5 py-5 border-b border-white/[0.06] flex-shrink-0">
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

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-hidden">
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
        <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0">
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
          </div>

          <div className="flex items-center gap-3">
            <SimpleNotificationBell
              companyId={companyId}
              onViewConversation={(conversationId) => {
                setSelectedConversationId(conversationId)
                setActiveTab('conversations')
              }}
            />
            <Button size="sm" onClick={() => setActiveTab('knowledge')}>
              <Plus className="h-4 w-4 mr-1.5" />
              Ny FAQ
            </Button>
          </div>
        </header>

        {/* Page Content - Scrollable area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {activeTab === 'dashboard' && companyId && (
            <DashboardView
              companyId={companyId}
              onViewAllConversations={() => setActiveTab('conversations')}
              onViewConversation={(id) => {
                setSelectedConversationId(id)
                setActiveTab('conversations')
              }}
            />
          )}
          {activeTab === 'conversations' && companyId && (
            <ConversationsView
              companyId={companyId}
              initialConversationId={selectedConversationId}
              onConversationOpened={() => setSelectedConversationId(null)}
            />
          )}
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
              greeting={businessProfile?.toneConfig?.greeting}
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
          {activeTab === 'settings' && companyId && <SettingsView companyId={companyId} userId={user?.uid} onNavigateToChannels={() => setActiveTab('channels')} />}
        </main>
      </div>

      {/* Botsy Chat Panel */}
      <BotsyChatPanel
        companyId={companyId}
        businessProfile={businessProfile}
        instructions={instructions}
        onInstructionCreated={handleInstructionCreated}
        onFAQCreated={() => {
          // Refresh the page or notify user - FAQ is already saved by the API
        }}
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
function DashboardView({ companyId, onViewAllConversations, onViewConversation }: {
  companyId: string
  onViewAllConversations: () => void
  onViewConversation: (conversationId: string) => void
}) {
  const [stats, setStats] = useState<{
    totalConversations: number
    conversationsToday: number
    smsCount: number
    widgetCount: number
    messengerCount: number
    instagramCount: number
    totalMessages: number
    recentConversations: Array<{
      id: string
      name: string
      phone?: string
      email?: string
      channel: 'sms' | 'widget' | 'messenger' | 'instagram'
      lastMessage: string
      lastMessageAt: Date
    }>
  } | null>(null)
  const [escalations, setEscalations] = useState<Array<{
    id: string
    customerIdentifier: string
    customerMessage: string
    channel: string
    createdAt: Date
    conversationId: string
  }>>([])
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

    async function fetchEscalations() {
      try {
        const response = await fetch(`/api/escalations?companyId=${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setEscalations(data.escalations || [])
        }
      } catch {
        // Silent fail
      }
    }

    fetchStats()
    fetchEscalations()

    // Poll for escalations every 10 seconds (same as notification bell)
    const interval = setInterval(fetchEscalations, 10000)
    return () => clearInterval(interval)
  }, [companyId])

  const totalChannels = (stats?.smsCount || 0) + (stats?.widgetCount || 0) + (stats?.instagramCount || 0) + (stats?.messengerCount || 0)
  const smsPercentage = totalChannels > 0 ? Math.round((stats?.smsCount || 0) / totalChannels * 100) : 0
  const widgetPercentage = totalChannels > 0 ? Math.round((stats?.widgetCount || 0) / totalChannels * 100) : 0
  const instagramPercentage = totalChannels > 0 ? Math.round((stats?.instagramCount || 0) / totalChannels * 100) : 0
  const messengerPercentage = totalChannels > 0 ? Math.round((stats?.messengerCount || 0) / totalChannels * 100) : 0

  return (
    <div className="space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-[#6B7A94]">Oversikt over Botsy sin aktivitet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
          value={isLoading ? '...' : String(((stats?.smsCount || 0) > 0 ? 1 : 0) + ((stats?.widgetCount || 0) > 0 ? 1 : 0) + ((stats?.instagramCount || 0) > 0 ? 1 : 0) + ((stats?.messengerCount || 0) > 0 ? 1 : 0))}
          change=""
          trend="up"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Pending Escalations */}
      {escalations.length > 0 && (
        <Card className="p-4 sm:p-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <HandHelping className="h-5 w-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white">Trenger oppmerksomhet</h2>
              <p className="text-red-400 text-xs sm:text-sm">{escalations.length} kunde{escalations.length !== 1 ? 'r' : ''} ønsker å snakke med en ansatt</p>
            </div>
          </div>
          <div className="space-y-3">
            {escalations.slice(0, 3).map((esc) => (
              <div
                key={esc.id}
                onClick={() => onViewConversation(esc.conversationId)}
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors"
              >
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-medium text-xs sm:text-sm flex-shrink-0">
                  {esc.customerIdentifier.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{esc.customerIdentifier}</p>
                  <p className="text-[#6B7A94] text-xs sm:text-sm truncate">"{esc.customerMessage}"</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#6B7A94] text-xs">{formatTimeAgo(esc.createdAt)}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                    Venter
                  </span>
                </div>
              </div>
            ))}
          </div>
          {escalations.length > 3 && (
            <Button variant="ghost" size="sm" className="w-full mt-4 text-red-400 hover:text-red-300" onClick={onViewAllConversations}>
              Se alle {escalations.length} henvendelser
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </Card>
      )}

      {/* Recent Conversations & Activity */}
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 overflow-hidden">
        <Card className="lg:col-span-2 p-4 lg:p-6 overflow-hidden">
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
                  onClick={() => onViewConversation(conv.id)}
                />
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 lg:p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-white mb-4 lg:mb-6">Aktivitet</h2>
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
            <ActivityItem
              icon={<MessageCircle className="h-4 w-4" />}
              text={`${stats?.messengerCount || 0} Messenger-samtaler`}
              time="Totalt"
            />
          </div>
        </Card>
      </div>

      {/* Channel Stats */}
      <Card className="p-4 lg:p-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-white mb-4 lg:mb-6">Samtaler per kanal</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          <ChannelStat channel="SMS" count={stats?.smsCount || 0} percentage={smsPercentage} color="#CDFF4D" />
          <ChannelStat channel="Widget" count={stats?.widgetCount || 0} percentage={widgetPercentage} color="#3B82F6" />
          <ChannelStat channel="Messenger" count={stats?.messengerCount || 0} percentage={messengerPercentage} color="#0084FF" />
          <ChannelStat channel="Instagram" count={stats?.instagramCount || 0} percentage={instagramPercentage} color="#E4405F" />
        </div>
      </Card>
    </div>
  )
}

function formatTimeAgo(date: Date | string | unknown): string {
  if (!date) return 'Ukjent'

  const now = new Date()
  let dateObj: Date

  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (typeof date === 'object' && date !== null && 'seconds' in date) {
    // Firestore Timestamp
    dateObj = new Date((date as { seconds: number }).seconds * 1000)
  } else {
    return 'Ukjent'
  }

  if (isNaN(dateObj.getTime())) return 'Ukjent'

  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Nå'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`
  if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'er' : ''} siden`

  return dateObj.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

// Knowledge Base View
// Helper function to calculate string similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  // Simple word overlap similarity
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 || words2.size === 0) return 0

  let overlap = 0
  words1.forEach(word => {
    if (words2.has(word)) overlap++
  })

  return overlap / Math.max(words1.size, words2.size)
}

interface SimilarFaqPair {
  faq1: { id: string; question: string; answer: string; source: string; confirmed: boolean }
  faq2: { id: string; question: string; answer: string; source: string; confirmed: boolean }
  similarity: number
}

function KnowledgeBaseView({ companyId }: { companyId: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'user' | 'extracted'>('all')
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string; source: string; confirmed: boolean }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const pendingFaqsRef = useRef<HTMLDivElement>(null)

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: string; question: string; answer: string } | null>(null)
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })

  // Duplicate detection states
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false)
  const [similarPairs, setSimilarPairs] = useState<SimilarFaqPair[]>([])
  const [currentPairIndex, setCurrentPairIndex] = useState(0)
  const [hasCheckedDuplicates, setHasCheckedDuplicates] = useState(false)

  const toast = useToast()

  // Load FAQs on mount
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

  useEffect(() => {
    loadFaqs()
  }, [companyId])

  // Check for similar FAQs after loading
  useEffect(() => {
    if (faqs.length > 1 && !isLoading && !hasCheckedDuplicates) {
      const pairs: SimilarFaqPair[] = []
      const SIMILARITY_THRESHOLD = 0.5 // 50% word overlap

      for (let i = 0; i < faqs.length; i++) {
        for (let j = i + 1; j < faqs.length; j++) {
          const similarity = calculateSimilarity(faqs[i].question, faqs[j].question)
          if (similarity >= SIMILARITY_THRESHOLD) {
            pairs.push({
              faq1: faqs[i],
              faq2: faqs[j],
              similarity,
            })
          }
        }
      }

      if (pairs.length > 0) {
        // Sort by similarity (highest first)
        pairs.sort((a, b) => b.similarity - a.similarity)
        setSimilarPairs(pairs)
        setCurrentPairIndex(0)
        setDuplicatesModalOpen(true)
      }
      setHasCheckedDuplicates(true)
    }
  }, [faqs, isLoading, hasCheckedDuplicates])

  // Handle keeping one FAQ and deleting the other
  const handleKeepFaq = async (keepId: string, deleteId: string) => {
    setIsSaving(true)
    try {
      const { deleteFAQ } = await import('@/lib/firestore')
      await deleteFAQ(companyId, deleteId)
      setFaqs(prev => prev.filter(f => f.id !== deleteId))

      // Move to next pair or close modal
      if (currentPairIndex < similarPairs.length - 1) {
        // Filter out pairs that involve the deleted FAQ
        const remainingPairs = similarPairs.filter(
          (p, idx) => idx > currentPairIndex && p.faq1.id !== deleteId && p.faq2.id !== deleteId
        )
        if (remainingPairs.length > 0) {
          setSimilarPairs(remainingPairs)
          setCurrentPairIndex(0)
        } else {
          setDuplicatesModalOpen(false)
        }
      } else {
        setDuplicatesModalOpen(false)
      }
      toast.success('FAQ fjernet', 'Duplikaten ble slettet')
    } catch {
      toast.error('Kunne ikke slette', 'Prøv igjen')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle merging two FAQs (keep question from first, combine answers)
  const handleMergeFaqs = async (faq1: SimilarFaqPair['faq1'], faq2: SimilarFaqPair['faq2']) => {
    setIsSaving(true)
    try {
      const { updateFAQ, deleteFAQ } = await import('@/lib/firestore')

      // Merge answers
      const mergedAnswer = `${faq1.answer}\n\n${faq2.answer}`

      // Update the first FAQ with merged answer
      await updateFAQ(companyId, faq1.id, { answer: mergedAnswer })

      // Delete the second FAQ
      await deleteFAQ(companyId, faq2.id)

      // Update local state
      setFaqs(prev => prev
        .map(f => f.id === faq1.id ? { ...f, answer: mergedAnswer } : f)
        .filter(f => f.id !== faq2.id)
      )

      // Move to next pair or close modal
      const remainingPairs = similarPairs.filter(
        (p, idx) => idx > currentPairIndex && p.faq1.id !== faq2.id && p.faq2.id !== faq2.id
      )
      if (remainingPairs.length > 0) {
        setSimilarPairs(remainingPairs)
        setCurrentPairIndex(0)
      } else {
        setDuplicatesModalOpen(false)
      }
      toast.success('FAQs slått sammen', 'De to FAQ-ene ble kombinert')
    } catch {
      toast.error('Kunne ikke slå sammen', 'Prøv igjen')
    } finally {
      setIsSaving(false)
    }
  }

  // Skip this pair
  const handleSkipPair = () => {
    if (currentPairIndex < similarPairs.length - 1) {
      setCurrentPairIndex(prev => prev + 1)
    } else {
      setDuplicatesModalOpen(false)
    }
  }

  // Skip all remaining pairs
  const handleSkipAll = () => {
    setDuplicatesModalOpen(false)
  }

  // Sync FAQs from documents
  const syncFromDocuments = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch(`/api/knowledge/sync-faqs?companyId=${companyId}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        toast.success('Synkronisering fullført', `${data.added} nye FAQs ble lagt til fra dokumenter`)
        await loadFaqs()
      } else {
        toast.error('Feil ved synkronisering', data.error || 'Kunne ikke synkronisere FAQs')
      }
    } catch {
      toast.error('Feil', 'Kunne ikke synkronisere FAQs fra dokumenter')
    } finally {
      setIsSyncing(false)
    }
  }

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSource = sourceFilter === 'all' || faq.source === sourceFilter
    return matchesSearch && matchesSource
  })

  const extractedCount = faqs.filter(f => f.source === 'extracted').length
  const manualCount = faqs.filter(f => f.source === 'user').length
  const unconfirmedCount = faqs.filter(f => !f.confirmed).length

  const handleConfirmAllFaqs = async () => {
    const unconfirmed = faqs.filter(f => !f.confirmed)
    if (unconfirmed.length === 0) return

    setIsSaving(true)
    try {
      const { updateFAQ } = await import('@/lib/firestore')
      for (const faq of unconfirmed) {
        await updateFAQ(companyId, faq.id, { confirmed: true })
      }
      setFaqs(faqs.map(f => ({ ...f, confirmed: true })))
      toast.success('Alle FAQs bekreftet', `${unconfirmed.length} FAQs ble bekreftet`)
    } catch {
      toast.error('Kunne ikke bekrefte alle', 'Prøv igjen senere')
    } finally {
      setIsSaving(false)
    }
  }

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

  const handleConfirmFaq = async (id: string) => {
    setIsSaving(true)
    try {
      const { updateFAQ } = await import('@/lib/firestore')
      await updateFAQ(companyId, id, { confirmed: true })
      setFaqs(faqs.map(f => f.id === id ? { ...f, confirmed: true } : f))
      toast.success('FAQ bekreftet', 'FAQ-en er nå bekreftet og aktiv')
    } catch {
      toast.error('Kunne ikke bekrefte', 'Prøv igjen senere')
    } finally {
      setIsSaving(false)
    }
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={syncFromDocuments} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Synk fra dokumenter
          </Button>
          <Button onClick={handleAddFaq}>
            <Plus className="h-4 w-4 mr-1.5" />
            Legg til FAQ
          </Button>
        </div>
      </div>

      {/* Source Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSourceFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            sourceFilter === 'all'
              ? 'bg-botsy-lime/10 text-botsy-lime'
              : 'text-[#A8B4C8] hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          Alle ({faqs.length})
        </button>
        <button
          onClick={() => setSourceFilter('user')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            sourceFilter === 'user'
              ? 'bg-botsy-lime/10 text-botsy-lime'
              : 'text-[#A8B4C8] hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          Manuelle ({manualCount})
        </button>
        <button
          onClick={() => setSourceFilter('extracted')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            sourceFilter === 'extracted'
              ? 'bg-botsy-lime/10 text-botsy-lime'
              : 'text-[#A8B4C8] hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          Fra dokumenter ({extractedCount})
        </button>
      </div>

      {/* Search */}
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
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
            <X className="h-4 w-4 mr-1.5" />
            Nullstill
          </Button>
        )}
      </div>

      {/* Unconfirmed FAQs Banner */}
      {unconfirmedCount > 0 && (
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">{unconfirmedCount} FAQ{unconfirmedCount !== 1 ? 's' : ''} venter på bekreftelse</p>
                <p className="text-[#A8B4C8] text-sm">Gjennomgå og bekreft FAQs fra dokumenter før de blir aktive</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => pendingFaqsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                Vis
              </Button>
              <Button
                variant="outline"
                onClick={handleConfirmAllFaqs}
                disabled={isSaving}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Bekreft alle
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[#6B7A94]">Ingen FAQs funnet</p>
          </Card>
        ) : (
          filteredFaqs.map((faq, index) => {
            // Find if this is the first unconfirmed FAQ
            const isFirstUnconfirmed = !faq.confirmed && filteredFaqs.findIndex(f => !f.confirmed) === index
            return (
            <Card
              key={faq.id}
              ref={isFirstUnconfirmed ? pendingFaqsRef : undefined}
              className={`p-5 ${!faq.confirmed ? 'border-amber-500/20 bg-amber-500/[0.02]' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className={faq.source === 'extracted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}>
                      {faq.source === 'user' ? 'Manuell' : faq.source === 'generated' ? 'Generert' : 'Fra dokument'}
                    </Badge>
                    {faq.confirmed ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Bekreftet</Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Venter på bekreftelse</Badge>
                    )}
                  </div>
                  <h3 className="text-white font-medium mb-2">{faq.question}</h3>
                  <p className="text-[#A8B4C8] text-sm">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!faq.confirmed && (
                    <button
                      onClick={() => handleConfirmFaq(faq.id)}
                      className="p-2 text-[#6B7A94] hover:text-green-400 hover:bg-green-500/10 rounded-lg"
                      title="Bekreft FAQ"
                      disabled={isSaving}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
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
            )
          })
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

      {/* Similar FAQs Modal */}
      <Modal
        isOpen={duplicatesModalOpen}
        onClose={handleSkipAll}
        title={`Lignende FAQs funnet (${currentPairIndex + 1} av ${similarPairs.length})`}
        size="lg"
      >
        {similarPairs.length > 0 && similarPairs[currentPairIndex] && (
          <div className="space-y-4">
            <p className="text-[#A8B4C8] text-sm">
              Disse to FAQ-ene ser ut til å handle om det samme ({Math.round(similarPairs[currentPairIndex].similarity * 100)}% likhet).
              Vil du slå dem sammen eller beholde én?
            </p>

            {/* FAQ 1 */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className={similarPairs[currentPairIndex].faq1.source === 'extracted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}>
                  {similarPairs[currentPairIndex].faq1.source === 'user' ? 'Manuell' : 'Fra dokument'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleKeepFaq(similarPairs[currentPairIndex].faq1.id, similarPairs[currentPairIndex].faq2.id)}
                  disabled={isSaving}
                  className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Behold denne
                </Button>
              </div>
              <p className="text-white font-medium mb-1">{similarPairs[currentPairIndex].faq1.question}</p>
              <p className="text-[#A8B4C8] text-sm">{similarPairs[currentPairIndex].faq1.answer}</p>
            </div>

            {/* FAQ 2 */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className={similarPairs[currentPairIndex].faq2.source === 'extracted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}>
                  {similarPairs[currentPairIndex].faq2.source === 'user' ? 'Manuell' : 'Fra dokument'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleKeepFaq(similarPairs[currentPairIndex].faq2.id, similarPairs[currentPairIndex].faq1.id)}
                  disabled={isSaving}
                  className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Behold denne
                </Button>
              </div>
              <p className="text-white font-medium mb-1">{similarPairs[currentPairIndex].faq2.question}</p>
              <p className="text-[#A8B4C8] text-sm">{similarPairs[currentPairIndex].faq2.answer}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleSkipPair}
                className="flex-1"
              >
                Hopp over
              </Button>
              <Button
                onClick={() => handleMergeFaqs(similarPairs[currentPairIndex].faq1, similarPairs[currentPairIndex].faq2)}
                disabled={isSaving}
                className="flex-1 bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90"
              >
                {isSaving ? 'Slår sammen...' : 'Slå sammen begge'}
              </Button>
            </div>

            {similarPairs.length > 1 && (
              <p className="text-[#6B7A94] text-xs text-center">
                {similarPairs.length - currentPairIndex - 1} flere lignende par å gjennomgå
              </p>
            )}
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

function SettingsView({ companyId, userId, onNavigateToChannels }: { companyId: string; userId?: string; onNavigateToChannels: () => void }) {
  const [settings, setSettings] = useState({
    botName: 'Botsy',
  })
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    dailySummary: false,
  })
  const [language, setLanguage] = useState('no')
  const [languageName, setLanguageName] = useState('Norsk')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(false)
  const [showCompanyId, setShowCompanyId] = useState(false)
  const [isSendingSummary, setIsSendingSummary] = useState(false)
  const { user } = useAuth()
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

  const handleSendDailySummary = async () => {
    const email = user?.email
    if (!email) {
      toast.error('Ingen e-post', 'Kunne ikke finne din e-postadresse')
      return
    }

    setIsSendingSummary(true)
    try {
      const response = await fetch('/api/notifications/daily-summary/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, email }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Oppsummering sendt!', `E-post sendt til ${email}`)
      } else {
        toast.error('Kunne ikke sende', data.error || 'Prøv igjen senere')
      }
    } catch {
      toast.error('Feil', 'Kunne ikke sende daglig oppsummering')
    } finally {
      setIsSendingSummary(false)
    }
  }

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getGeneralSettings, getBusinessProfile, getUserNotificationPreferences } = await import('@/lib/firestore')
        const savedSettings = await getGeneralSettings(companyId)
        setSettings({ botName: savedSettings.botName })

        // Load user-level notification preferences
        if (userId) {
          const userPrefs = await getUserNotificationPreferences(userId)
          setNotificationPrefs({
            emailNotifications: userPrefs.emailNotifications,
            dailySummary: userPrefs.dailySummary,
          })
        }

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
  }, [companyId, userId])

  const handleNotificationToggle = (key: 'emailNotifications' | 'dailySummary') => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }))
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
      const { saveGeneralSettings, saveToneConfig, saveUserNotificationPreferences } = await import('@/lib/firestore')
      await saveGeneralSettings(companyId, settings)
      // Save user notification preferences
      if (userId) {
        await saveUserNotificationPreferences(userId, notificationPrefs)
      }
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
          Koble til Messenger, Instagram, SMS og Widget for å la Botsy svare kunder på alle plattformer.
        </p>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Varsler</h2>
        <p className="text-[#6B7A94] text-sm mb-6">
          Varslene sendes til din e-postadresse.
        </p>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-white text-sm font-medium">E-postvarsler</p>
              <p className="text-[#6B7A94] text-sm">Få e-post når kunder ber om å snakke med en ansatt</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('emailNotifications')}
              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${notificationPrefs.emailNotifications ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${notificationPrefs.emailNotifications ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="text-white text-sm font-medium">Daglig oppsummering</p>
                <p className="text-[#6B7A94] text-sm">Motta daglig analyse, dagens beste ansatt og statistikk på e-post</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('dailySummary')}
                className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${notificationPrefs.dailySummary ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
              >
                <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${notificationPrefs.dailySummary ? 'right-1' : 'left-1 bg-white/50'}`} />
              </button>
            </div>
            {notificationPrefs.dailySummary && (
              <div className="mt-3 p-3 bg-botsy-lime/5 border border-botsy-lime/20 rounded-lg">
                <p className="text-botsy-lime/80 text-xs">
                  Du vil motta en daglig oppsummering hver morgen kl. 08:00 med statistikk,
                  analyse og hvem som var dagens beste ansatt.
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendDailySummary}
                disabled={isSendingSummary}
                className="w-full sm:w-auto"
              >
                {isSendingSummary ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                {isSendingSummary ? 'Sender...' : 'Send oppsummering nå'}
              </Button>
              <p className="text-[#6B7A94] text-xs mt-2">
                Sender dagens oppsummering til {user?.email || 'din e-post'} med én gang
              </p>
            </div>
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

function ConversationPreview({ name, message, time, channel, status, onClick }: {
  name: string
  message: string
  time: string
  channel: 'instagram' | 'messenger' | 'sms' | 'widget'
  status: 'resolved' | 'pending' | 'escalated'
  onClick?: () => void
}) {
  const channelColors: Record<string, string> = {
    instagram: '#E4405F',
    messenger: '#0084FF',
    sms: '#CDFF4D',
    widget: '#3B82F6'
  }

  const statusConfig = {
    resolved: { color: 'text-green-400', icon: <CheckCheck className="h-4 w-4" /> },
    pending: { color: 'text-yellow-400', icon: <Clock className="h-4 w-4" /> },
    escalated: { color: 'text-red-400', icon: <AlertCircle className="h-4 w-4" /> }
  }

  return (
    <div onClick={onClick} className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0">
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white font-medium text-sm truncate">{name}</p>
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: channelColors[channel] }} />
        </div>
        <p className="text-[#6B7A94] text-xs sm:text-sm truncate">{message}</p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <p className="text-[#6B7A94] text-xs mb-1">{time}</p>
        <span className={`${statusConfig[status].color} flex justify-end`}>{statusConfig[status].icon}</span>
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

