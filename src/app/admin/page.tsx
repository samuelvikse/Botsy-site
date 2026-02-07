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
  Check,
  CheckCheck,
  Bot,
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
  Mail,
  Send,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { SubscriptionGate } from '@/components/SubscriptionGate'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, PermissionProvider } from '@/contexts/PermissionContext'
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext'
import { FloatingSaveButton } from '@/components/dashboard/FloatingSaveButton'
import { BotsyChatPanel } from '@/components/dashboard/BotsyChatPanel'
import { InstructionsView } from '@/components/dashboard/InstructionsView'
import { WidgetSettingsView } from '@/components/dashboard/WidgetSettingsView'
import { AnalyticsView } from '@/components/dashboard/AnalyticsView'
import { ConversationsView } from '@/components/dashboard/ConversationsView'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { ToneConfigView } from '@/components/dashboard/ToneConfigView'
import { KnowledgeDocsView } from '@/components/dashboard/KnowledgeDocsView'
import { ChannelsView } from '@/components/dashboard/ChannelsView'
import SecuritySettingsView from '@/components/dashboard/SecuritySettingsView'
import { EmployeesView } from '@/components/dashboard/EmployeesView'
import { ProfileDropdown } from '@/components/dashboard/ProfileDropdown'
import { WelcomeView } from '@/components/dashboard/WelcomeView'
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
      <AdminWrapper />
    </ProtectedRoute>
  )
}

function AdminWrapper() {
  const { user, userData } = useAuth()

  // Check if user has a company
  const hasCompany = userData?.companyId && userData.companyId !== ''

  // Show welcome view for users without a company
  if (!hasCompany) {
    return (
      <div className="min-h-screen bg-botsy-dark">
        <WelcomeView
          userEmail={user?.email || ''}
          userName={userData?.displayName || user?.displayName || ''}
        />
      </div>
    )
  }

  // User has a company - show normal admin content
  return (
    <PermissionProvider>
      <SubscriptionGate>
        <UnsavedChangesProvider>
          <AdminContent />
          <FloatingSaveButton />
        </UnsavedChangesProvider>
      </SubscriptionGate>
    </PermissionProvider>
  )
}

function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true) // default true to avoid flash
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
        setOnboardingCompleted(data.onboardingCompleted === true)
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
              userId={user?.uid}
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
          {/* Onboarding incomplete banner */}
          {!onboardingCompleted && (
            <Link href="/onboarding">
              <Card className="p-4 mb-4 bg-botsy-lime/5 border-botsy-lime/20 hover:bg-botsy-lime/10 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-botsy-lime/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-botsy-lime" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Fullfør oppsettet av chatboten</p>
                      <p className="text-[#A8B4C8] text-sm">Legg til nettside, tilpass personlighet og FAQs for best mulig kundeservice</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-botsy-lime flex-shrink-0" />
                </div>
              </Card>
            </Link>
          )}

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
          {activeTab === 'settings' && companyId && <SettingsView companyId={companyId} userId={user?.uid} onNavigateToChannels={() => setActiveTab('channels')} onNavigateToKnowledge={() => setActiveTab('knowledge')} />}
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string; source: string; confirmed: boolean; category?: string }>>([])
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
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'Generelt' })

  // Unanswered questions state
  const [unansweredQuestions, setUnansweredQuestions] = useState<Array<{
    id: string
    question: string
    customerIdentifier?: string
    channel?: string
    createdAt?: string
  }>>([])
  const [unansweredAnswers, setUnansweredAnswers] = useState<Record<string, string>>({})
  const [savingUnanswered, setSavingUnanswered] = useState<string | null>(null)

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

  // Load unanswered questions
  const loadUnansweredQuestions = async () => {
    try {
      const response = await fetch(`/api/unanswered-questions?companyId=${companyId}`)
      const data = await response.json()
      if (data.questions) {
        setUnansweredQuestions(data.questions)
      }
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    loadFaqs()
    loadUnansweredQuestions()
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
    const matchesCategory = categoryFilter === 'all' || (faq.category || 'Generelt') === categoryFilter
    return matchesSearch && matchesSource && matchesCategory
  })

  const extractedCount = faqs.filter(f => f.source === 'extracted').length
  const manualCount = faqs.filter(f => f.source === 'user').length
  const unconfirmedCount = faqs.filter(f => !f.confirmed).length
  const availableCategories = [...new Set(faqs.map(f => f.category || 'Generelt'))].sort()

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

  // Handle adding an unanswered question as FAQ
  const handleAddUnansweredAsFaq = async (questionId: string, question: string) => {
    const answer = unansweredAnswers[questionId]?.trim()
    if (!answer) return

    setSavingUnanswered(questionId)
    try {
      const { addFAQ } = await import('@/lib/firestore')
      const newFaqData = {
        id: `faq-${Date.now()}`,
        question,
        answer,
        source: 'user' as const,
        confirmed: true,
      }
      await addFAQ(companyId, newFaqData)
      setFaqs(prev => [...prev, newFaqData])

      // Mark question as resolved
      await fetch('/api/unanswered-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, companyId }),
      })

      setUnansweredQuestions(prev => prev.filter(q => q.id !== questionId))
      setUnansweredAnswers(prev => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
      toast.success('FAQ lagt til', 'Spørsmålet ble besvart og lagt til i kunnskapsbasen')
    } catch {
      toast.error('Kunne ikke legge til', 'Prøv igjen senere')
    } finally {
      setSavingUnanswered(null)
    }
  }

  // Handle ignoring an unanswered question
  const handleIgnoreUnanswered = async (questionId: string) => {
    setSavingUnanswered(questionId)
    try {
      await fetch('/api/unanswered-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, companyId }),
      })

      setUnansweredQuestions(prev => prev.filter(q => q.id !== questionId))
      setUnansweredAnswers(prev => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
    } catch {
      toast.error('Kunne ikke ignorere', 'Prøv igjen senere')
    } finally {
      setSavingUnanswered(null)
    }
  }

  const handleAddFaq = () => {
    setNewFaq({ question: '', answer: '', category: 'Generelt' })
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
          category: newFaq.category,
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

        {/* Category Filter */}
        {availableCategories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="ml-auto px-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.06] text-[#A8B4C8] focus:outline-none focus:border-botsy-lime/50"
          >
            <option value="all">Alle kategorier</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
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
                <p className="text-white font-medium">{unconfirmedCount} FAQ{unconfirmedCount !== 1 ? 's' : ''} venter på godkjenning</p>
                <p className="text-[#A8B4C8] text-sm">Gjennomgå og godkjenn eller avvis FAQs før de blir aktive for kunder</p>
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
                Godkjenn alle
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Unanswered Questions Section */}
      {unansweredQuestions.length > 0 && (
        <Card className="p-5 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">Kunder spurte om dette, men Botsy hadde ikke svar</p>
              <p className="text-[#A8B4C8] text-sm">Legg til svar for å forbedre Botsy sine kunnskaper</p>
            </div>
          </div>
          <div className="space-y-3">
            {unansweredQuestions.map((q) => (
              <div key={q.id} className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                <p className="text-purple-300 text-sm mb-1">En kunde spurte nylig:</p>
                <p className="text-white font-medium mb-3">&ldquo;{q.question}&rdquo;</p>
                <textarea
                  rows={2}
                  value={unansweredAnswers[q.id] || ''}
                  onChange={(e) => setUnansweredAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Hva skal Botsy svare på dette?"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-purple-500/50 resize-none mb-3"
                  disabled={savingUnanswered === q.id}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddUnansweredAsFaq(q.id, q.question)}
                    disabled={!unansweredAnswers[q.id]?.trim() || savingUnanswered === q.id}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {savingUnanswered === q.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Legg til som FAQ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleIgnoreUnanswered(q.id)}
                    disabled={savingUnanswered === q.id}
                    className="text-[#6B7A94] hover:text-white"
                  >
                    Ignorer
                  </Button>
                </div>
              </div>
            ))}
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
                    <Badge variant="secondary" className={
                      faq.source === 'extracted' || faq.source === 'website_auto' || faq.source === 'website'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : ''
                    }>
                      {faq.source === 'user' || faq.source === 'manual' ? 'Manuell' : faq.source === 'generated' ? 'Generert' : faq.source === 'website_auto' || faq.source === 'website' ? 'Fra nettside' : 'Fra dokument'}
                    </Badge>
                    {faq.category && (
                      <Badge variant="secondary" className="bg-white/[0.05] text-[#A8B4C8] border-white/[0.1]">
                        {faq.category}
                      </Badge>
                    )}
                    {faq.confirmed ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Bekreftet</Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Venter på godkjenning</Badge>
                    )}
                  </div>
                  <h3 className="text-white font-medium mb-2">{faq.question}</h3>
                  <p className="text-[#A8B4C8] text-sm">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!faq.confirmed ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirmFaq(faq.id)}
                        className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                        disabled={isSaving}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Godkjenn
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Avvis
                      </Button>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
          <div>
            <label className="text-white text-sm font-medium block mb-2">Kategori</label>
            <select
              value={newFaq.category}
              onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
            >
              {['Generelt', 'Priser', 'Tjenester', 'Kontakt', 'Åpningstider', 'Ansatte', 'Retningslinjer', 'Produkter', 'Levering', 'Betaling'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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

function SettingsView({ companyId, userId, onNavigateToChannels, onNavigateToKnowledge }: { companyId: string; userId?: string; onNavigateToChannels: () => void; onNavigateToKnowledge: () => void }) {
  const [settings, setSettings] = useState({
    botName: 'Botsy',
    allowEscalation: true,
    autoEmailReply: false,
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
  const [syncConfig, setSyncConfig] = useState({
    enabled: false,
    websiteUrl: '',
    autoApproveWebsiteFaqs: false,
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [pendingFaqCount, setPendingFaqCount] = useState<number>(0)
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

  const handleSaveSyncConfig = async () => {
    try {
      const { saveSyncConfig } = await import('@/lib/knowledge-sync/firestore')
      await saveSyncConfig(companyId, {
        enabled: syncConfig.enabled,
        websiteUrl: syncConfig.websiteUrl,
        autoApproveWebsiteFaqs: syncConfig.autoApproveWebsiteFaqs,
      })
      toast.success('Synkronisering lagret', 'Innstillingene ble oppdatert')
    } catch {
      toast.error('Kunne ikke lagre', 'Prøv igjen senere')
    }
  }

  const handleManualSync = async () => {
    if (!syncConfig.websiteUrl) {
      toast.error('Mangler URL', 'Legg til en nettside-URL først')
      return
    }

    setIsSyncing(true)
    setSyncStatus('Synkroniserer...')
    setPendingFaqCount(0)
    try {
      // Auto-save sync config before syncing so the URL is persisted
      try {
        const { saveSyncConfig } = await import('@/lib/knowledge-sync/firestore')
        await saveSyncConfig(companyId, {
          enabled: syncConfig.enabled,
          websiteUrl: syncConfig.websiteUrl,
          autoApproveWebsiteFaqs: syncConfig.autoApproveWebsiteFaqs,
        })
      } catch {
        // Continue with sync even if config save fails
      }

      const response = await fetch('/api/sync/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, websiteUrl: syncConfig.websiteUrl }),
      })
      const data = await response.json()

      if (data.success) {
        const newCount = data.newFaqsCreated || 0
        if (newCount > 0 && !syncConfig.autoApproveWebsiteFaqs) {
          setPendingFaqCount(newCount)
          setSyncStatus(`Fullført: ${newCount} nye FAQs venter på godkjenning`)
          toast.success('Synkronisering fullført', `${newCount} nye FAQs venter på godkjenning i kunnskapsbasen`)
        } else if (newCount > 0) {
          setSyncStatus(`Fullført: ${newCount} nye FAQs lagt til`)
          toast.success('Synkronisering fullført', `${newCount} nye FAQs ble automatisk godkjent`)
        } else {
          setSyncStatus('Fullført: Ingen nye FAQs funnet')
          toast.success('Synkronisering fullført', 'Ingen nye FAQs ble funnet')
        }
      } else {
        setSyncStatus('Feilet')
        toast.error('Synkronisering feilet', data.error || 'Kunne ikke synkronisere')
      }
    } catch {
      setSyncStatus('Feilet')
      toast.error('Feil', 'Nettverksfeil ved synkronisering')
    } finally {
      setIsSyncing(false)
    }
  }

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getGeneralSettings, getBusinessProfile, getUserNotificationPreferences } = await import('@/lib/firestore')
        const savedSettings = await getGeneralSettings(companyId)
        setSettings({
          botName: savedSettings.botName,
          allowEscalation: savedSettings.allowEscalation ?? true,
          autoEmailReply: savedSettings.autoEmailReply ?? true,
        })

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

        // Load sync config
        const { getSyncConfig } = await import('@/lib/knowledge-sync/firestore')
        const savedSyncConfig = await getSyncConfig(companyId)
        if (savedSyncConfig) {
          setSyncConfig({
            enabled: savedSyncConfig.enabled,
            websiteUrl: savedSyncConfig.websiteUrl || '',
            autoApproveWebsiteFaqs: savedSyncConfig.autoApproveWebsiteFaqs,
          })
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

      {/* Chatbot Behavior */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Chatbot-atferd</h2>
        <p className="text-[#6B7A94] text-sm mb-6">
          Styr hvordan Botsy håndterer eskaleringer og automatiske svar.
        </p>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-white text-sm font-medium">Tillat eskalering til ansatt</p>
              <p className="text-[#6B7A94] text-sm">La kunder be om å snakke med en ansatt i chatten</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, allowEscalation: !prev.allowEscalation }))}
              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${settings.allowEscalation ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${settings.allowEscalation ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="text-white text-sm font-medium">Automatisk e-postsvar</p>
                <p className="text-[#6B7A94] text-sm">AI svarer automatisk på innkommende e-poster</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, autoEmailReply: !prev.autoEmailReply }))}
                className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${settings.autoEmailReply ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
              >
                <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${settings.autoEmailReply ? 'right-1' : 'left-1 bg-white/50'}`} />
              </button>
            </div>
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

      {/* Website Sync */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-5 w-5 text-botsy-lime" />
          <h2 className="text-lg font-semibold text-white">Nettside-synkronisering</h2>
        </div>
        <p className="text-[#6B7A94] text-sm mb-6">
          Automatisk hent FAQs og innhold fra nettsiden din for å holde kunnskapsbasen oppdatert.
        </p>
        <div className="space-y-5">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-white text-sm font-medium">Aktiver synkronisering</p>
              <p className="text-[#6B7A94] text-sm">Automatisk synkroniser FAQs fra nettsiden</p>
            </div>
            <button
              onClick={() => setSyncConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${syncConfig.enabled ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${syncConfig.enabled ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>

          {/* Website URL */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">Nettside-URL</label>
            <input
              type="url"
              value={syncConfig.websiteUrl}
              onChange={(e) => setSyncConfig(prev => ({ ...prev, websiteUrl: e.target.value }))}
              placeholder="https://eksempel.no"
              className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 placeholder:text-[#6B7A94]"
            />
            <p className="text-[#6B7A94] text-xs mt-2">URL til nettsiden du vil hente FAQs fra</p>
          </div>

          {/* Auto-approve Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-white text-sm font-medium">Automatisk godkjenning</p>
              <p className="text-[#6B7A94] text-sm">Godkjenn nye FAQs automatisk uten manuell gjennomgang</p>
            </div>
            <button
              onClick={() => setSyncConfig(prev => ({ ...prev, autoApproveWebsiteFaqs: !prev.autoApproveWebsiteFaqs }))}
              className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${syncConfig.autoApproveWebsiteFaqs ? 'bg-botsy-lime' : 'bg-white/[0.1]'}`}
            >
              <span className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${syncConfig.autoApproveWebsiteFaqs ? 'right-1' : 'left-1 bg-white/50'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={handleSaveSyncConfig}
              className="flex-1"
            >
              Lagre konfigurasjon
            </Button>
            <Button
              onClick={handleManualSync}
              disabled={isSyncing || !syncConfig.websiteUrl}
              className="flex-1"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              {isSyncing ? 'Synkroniserer...' : 'Synkroniser nå'}
            </Button>
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              syncStatus.includes('Fullført')
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : syncStatus.includes('Feilet')
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <span>{syncStatus}</span>
                {pendingFaqCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onNavigateToKnowledge}
                    className="text-green-400 border-green-500/30 hover:bg-green-500/10 flex-shrink-0"
                  >
                    <BookOpen className="h-4 w-4 mr-1.5" />
                    Gå til kunnskapsbasen
                  </Button>
                )}
              </div>
            </div>
          )}
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

