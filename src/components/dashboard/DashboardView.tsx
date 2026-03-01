'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Phone,
  MessageCircle,
  ChevronRight,
  HandHelping,
  HelpCircle,
  Sparkles,
  Zap,
  Instagram,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authFetch } from '@/lib/auth-fetch'

interface DashboardStats {
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
}

interface Escalation {
  id: string
  customerIdentifier: string
  customerMessage: string
  channel: string
  createdAt: Date
  conversationId: string
}

interface UnansweredQuestion {
  id: string
  question: string
  customerIdentifier: string
  channel: string
  createdAt: Date
  conversationId: string
}

interface DashboardViewProps {
  companyId: string
  onViewAllConversations: () => void
  onViewConversation: (conversationId: string) => void
}

export function DashboardView({ companyId, onViewAllConversations, onViewConversation }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [unansweredQuestions, setUnansweredQuestions] = useState<UnansweredQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { getDashboardStats } = await import('@/lib/sms-firestore')
        const dashboardStats = await getDashboardStats(companyId)
        setStats(dashboardStats)
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false)
      }
    }

    async function fetchEscalations() {
      try {
        const response = await authFetch(`/api/escalations?companyId=${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setEscalations(data.escalations || [])
        }
      } catch {
        // Silent fail
      }
    }

    async function fetchUnansweredQuestions() {
      try {
        const response = await authFetch(`/api/unanswered-questions?companyId=${companyId}`)
        if (response.ok) {
          const data = await response.json()
          setUnansweredQuestions(data.questions || [])
        }
      } catch {
        // Silent fail
      }
    }

    fetchStats()
    fetchEscalations()
    fetchUnansweredQuestions()

    const interval = setInterval(() => {
      fetchStats()
      fetchEscalations()
      fetchUnansweredQuestions()
    }, 10000)
    return () => clearInterval(interval)
  }, [companyId])

  const channelIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <Phone className="h-3.5 w-3.5" />
      case 'widget': return <MessageCircle className="h-3.5 w-3.5" />
      case 'messenger': return <MessageSquare className="h-3.5 w-3.5" />
      case 'instagram': return <Instagram className="h-3.5 w-3.5" />
      default: return <MessageCircle className="h-3.5 w-3.5" />
    }
  }

  const channelColor = (channel: string) => {
    switch (channel) {
      case 'sms': return '#CDFF4D'
      case 'widget': return '#3B82F6'
      case 'messenger': return '#0084FF'
      case 'instagram': return '#E4405F'
      default: return '#6B7A94'
    }
  }

  const channelLabel = (channel: string) => {
    switch (channel) {
      case 'sms': return 'SMS'
      case 'widget': return 'Widget'
      case 'messenger': return 'Messenger'
      case 'instagram': return 'Instagram'
      default: return channel
    }
  }

  const activeChannelCount = [
    (stats?.smsCount || 0) > 0,
    (stats?.widgetCount || 0) > 0,
    (stats?.instagramCount || 0) > 0,
    (stats?.messengerCount || 0) > 0,
  ].filter(Boolean).length

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-[#6B7A94]">Oversikt over aktivitet og henvendelser</p>
      </motion.div>

      {/* Key Stats — all real data from Firestore */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <DashStatCard
          title="Samtaler i dag"
          value={isLoading ? '...' : String(stats?.conversationsToday || 0)}
          icon={<MessageSquare className="h-5 w-5" />}
          accentColor="lime"
          delay={0}
        />
        <DashStatCard
          title="Totale samtaler"
          value={isLoading ? '...' : String(stats?.totalConversations || 0)}
          icon={<Zap className="h-5 w-5" />}
          accentColor="blue"
          delay={0.1}
        />
        <DashStatCard
          title="Totale meldinger"
          value={isLoading ? '...' : String(stats?.totalMessages || 0)}
          icon={<MessageCircle className="h-5 w-5" />}
          accentColor="green"
          delay={0.2}
        />
        <DashStatCard
          title="Aktive kanaler"
          value={isLoading ? '...' : String(activeChannelCount)}
          subtitle="av 4 tilgjengelige"
          icon={<Sparkles className="h-5 w-5" />}
          accentColor="lime"
          delay={0.3}
        />
      </div>

      {/* Pending Escalations — real data from API */}
      <AnimatePresence>
        {escalations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="p-4 sm:p-6 border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <HandHelping className="h-5 w-5 text-red-400" />
                </motion.div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Trenger oppmerksomhet</h2>
                  <p className="text-red-400 text-xs sm:text-sm">{escalations.length} kunde{escalations.length !== 1 ? 'r' : ''} venter svar</p>
                </div>
              </div>
              <div className="space-y-3">
                {escalations.slice(0, 3).map((esc, index) => (
                  <motion.div
                    key={esc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onViewConversation(esc.conversationId)}
                    className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all duration-200 hover:translate-x-1"
                  >
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-medium text-xs sm:text-sm flex-shrink-0">
                      {esc.customerIdentifier.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{esc.customerIdentifier}</p>
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${channelColor(esc.channel)}15`, color: channelColor(esc.channel) }}>
                          {channelIcon(esc.channel)}
                          {channelLabel(esc.channel)}
                        </span>
                      </div>
                      <p className="text-[#6B7A94] text-xs sm:text-sm truncate">&quot;{esc.customerMessage}&quot;</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#6B7A94] text-xs">{formatTimeAgo(esc.createdAt)}</p>
                      <Badge variant="error" className="mt-1 text-xs">Venter</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
              {escalations.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full mt-4 text-red-400 hover:text-red-300" onClick={onViewAllConversations}>
                  Se alle {escalations.length} henvendelser
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unanswered Questions — real data from API */}
      <AnimatePresence>
        {unansweredQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-4 sm:p-6 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <HelpCircle className="h-5 w-5 text-yellow-400" />
                </motion.div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Ubesvarte spørsmål</h2>
                  <p className="text-yellow-400 text-xs sm:text-sm">Chatboten kunne ikke svare på {unansweredQuestions.length} spørsmål</p>
                </div>
              </div>
              <div className="space-y-3">
                {unansweredQuestions.slice(0, 3).map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onViewConversation(q.conversationId)}
                    className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-all duration-200 hover:translate-x-1"
                  >
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-medium text-xs sm:text-sm flex-shrink-0">
                      ?
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{q.customerIdentifier}</p>
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${channelColor(q.channel)}15`, color: channelColor(q.channel) }}>
                          {channelIcon(q.channel)}
                          {channelLabel(q.channel)}
                        </span>
                      </div>
                      <p className="text-[#6B7A94] text-xs sm:text-sm truncate">&quot;{q.question}&quot;</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#6B7A94] text-xs">{formatTimeAgo(q.createdAt)}</p>
                      <Badge className="mt-1 text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Ubesvart</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
              {unansweredQuestions.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full mt-4 text-yellow-400 hover:text-yellow-300" onClick={onViewAllConversations}>
                  Se alle {unansweredQuestions.length} ubesvarte spørsmål
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              <p className="text-yellow-400/60 text-xs mt-3">
                Tips: Legg til svar i kunnskapsbasen for å forbedre chatboten
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Conversations — real data from Firestore */}
      <Card className="p-4 lg:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Nylige samtaler</h2>
            <p className="text-[#6B7A94] text-sm mt-0.5">Siste henvendelser på tvers av kanaler</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAllConversations}>
            Se alle
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-botsy-lime animate-spin" />
            </div>
          ) : stats?.recentConversations?.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-[#6B7A94] opacity-50" />
              <p className="text-[#6B7A94] text-sm">Ingen samtaler ennå</p>
              <p className="text-[#4A5568] text-xs mt-1">Samtaler vises her når kunder tar kontakt</p>
            </div>
          ) : (
            stats?.recentConversations?.slice(0, 6).map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onViewConversation(conv.id)}
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer group"
              >
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/[0.08] flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0 group-hover:bg-white/[0.12] transition-colors">
                  {conv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-medium text-sm truncate">{conv.name}</p>
                    <span
                      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${channelColor(conv.channel)}15`, color: channelColor(conv.channel) }}
                    >
                      {channelIcon(conv.channel)}
                      {channelLabel(conv.channel)}
                    </span>
                  </div>
                  <p className="text-[#6B7A94] text-xs sm:text-sm truncate">{conv.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <p className="text-[#6B7A94] text-xs">{formatTimeAgo(conv.lastMessageAt)}</p>
                  <ChevronRight className="h-4 w-4 text-[#4A5568] mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Channel Overview — real counts from Firestore */}
      {!isLoading && stats && (stats.totalConversations > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'SMS', count: stats.smsCount, icon: <Phone className="h-4 w-4" />, color: '#CDFF4D' },
            { name: 'Widget', count: stats.widgetCount, icon: <MessageCircle className="h-4 w-4" />, color: '#3B82F6' },
            { name: 'Messenger', count: stats.messengerCount, icon: <MessageSquare className="h-4 w-4" />, color: '#0084FF' },
            { name: 'Instagram', count: stats.instagramCount, icon: <Instagram className="h-4 w-4" />, color: '#E4405F' },
          ].map((ch) => (
            <motion.div
              key={ch.name}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#161d33]/60 border border-white/[0.05]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${ch.color}15`, color: ch.color }}
              >
                {ch.icon}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{ch.count}</p>
                <p className="text-[#6B7A94] text-xs">{ch.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && stats?.totalConversations === 0 && escalations.length === 0 && unansweredQuestions.length === 0 && (
        <Card className="p-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-botsy-lime/40" />
            <h2 className="text-lg font-semibold text-white mb-2">Velkommen til Botsy!</h2>
            <p className="text-[#6B7A94] text-sm max-w-md mx-auto">
              Ingen samtaler ennå. Når kunder begynner å chatte via SMS, widget, Messenger eller Instagram,
              vil all aktivitet vises her.
            </p>
          </motion.div>
        </Card>
      )}
    </div>
  )
}

// Stat Card
function DashStatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = 'lime',
  delay = 0,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  accentColor?: 'lime' | 'blue' | 'green'
  delay?: number
}) {
  const colorClasses = {
    lime: { bg: 'bg-botsy-lime/10', text: 'text-botsy-lime' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400' },
  }
  const colors = colorClasses[accentColor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="p-5 card-lift border-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
        <div className="flex items-start justify-between mb-3">
          <motion.div
            className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} ring-1 ring-white/[0.06]`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {icon}
          </motion.div>
        </div>
        <motion.p
          className="text-2xl font-bold text-white mb-1 font-display"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1 }}
        >
          {value}
        </motion.p>
        <p className="text-[#8896AB] text-sm">{title}</p>
        {subtitle && <p className="text-[#586578] text-xs mt-0.5">{subtitle}</p>}
      </Card>
    </motion.div>
  )
}

// Utility function
function formatTimeAgo(date: Date | string | unknown): string {
  if (!date) return 'Ukjent'

  const now = new Date()
  let dateObj: Date

  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (typeof date === 'object' && date !== null && 'seconds' in date) {
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
