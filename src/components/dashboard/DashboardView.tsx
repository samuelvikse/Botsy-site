'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  TrendingUp,
  Clock,
  Zap,
  Phone,
  MessageCircle,
  ChevronRight,
  HandHelping,
  CheckCheck,
  AlertCircle,
  ThumbsUp,
  HelpCircle,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalConversations: number
  conversationsToday: number
  conversationsYesterday: number
  conversationsThisWeek: number
  conversationsLastWeek: number
  smsCount: number
  widgetCount: number
  messengerCount: number
  instagramCount: number
  totalMessages: number
  avgResponseTime: number // in seconds
  satisfactionRate: number // percentage
  peakHour: number // 0-23
  topQuestions: Array<{ question: string; count: number }>
  conversationsPerHour: number[]
  conversationsLast7Days: Array<{ date: string; count: number }>
  recentConversations: Array<{
    id: string
    name: string
    phone?: string
    email?: string
    channel: 'sms' | 'widget' | 'messenger' | 'instagram'
    lastMessage: string
    lastMessageAt: Date
    sentiment?: 'positive' | 'neutral' | 'negative'
  }>
  recentActivity: Array<{
    id: string
    type: 'new_conversation' | 'escalation' | 'resolution' | 'feedback'
    message: string
    timestamp: Date
    channel?: string
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

        // Enhance stats with additional mock data for demonstration
        // In production, these would come from actual analytics
        const today = new Date()
        const enhancedStats: DashboardStats = {
          ...dashboardStats,
          conversationsYesterday: Math.max(0, dashboardStats.conversationsToday - Math.floor(Math.random() * 3)),
          conversationsThisWeek: dashboardStats.totalConversations,
          conversationsLastWeek: Math.floor(dashboardStats.totalConversations * 0.85),
          avgResponseTime: 2.4, // seconds - would calculate from actual message timestamps
          satisfactionRate: 94, // percentage - would calculate from feedback
          peakHour: 14, // 2 PM - would calculate from message timestamps
          topQuestions: [
            { question: 'Hva er åpningstidene?', count: 23 },
            { question: 'Hvordan bestiller jeg?', count: 18 },
            { question: 'Hva koster frakt?', count: 15 },
            { question: 'Kan jeg returnere?', count: 12 },
            { question: 'Hvor lang leveringstid?', count: 9 },
          ],
          conversationsPerHour: Array.from({ length: 24 }, (_, i) => {
            // Simulate typical business hours pattern
            if (i >= 8 && i <= 17) return Math.floor(Math.random() * 8) + 2
            if (i >= 6 && i <= 20) return Math.floor(Math.random() * 4) + 1
            return Math.floor(Math.random() * 2)
          }),
          conversationsLast7Days: Array.from({ length: 7 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (6 - i))
            return {
              date: date.toLocaleDateString('nb-NO', { weekday: 'short' }),
              count: Math.floor(Math.random() * 15) + 3,
            }
          }),
          recentActivity: [
            {
              id: '1',
              type: 'new_conversation',
              message: 'Ny samtale startet via widget',
              timestamp: new Date(Date.now() - 5 * 60000),
              channel: 'widget',
            },
            {
              id: '2',
              type: 'resolution',
              message: 'Samtale fullført - kunde fornøyd',
              timestamp: new Date(Date.now() - 15 * 60000),
              channel: 'sms',
            },
            {
              id: '3',
              type: 'feedback',
              message: 'Positiv tilbakemelding mottatt',
              timestamp: new Date(Date.now() - 45 * 60000),
            },
            {
              id: '4',
              type: 'new_conversation',
              message: 'Ny samtale via SMS',
              timestamp: new Date(Date.now() - 90 * 60000),
              channel: 'sms',
            },
          ],
        }

        setStats(enhancedStats)
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

    async function fetchUnansweredQuestions() {
      try {
        const response = await fetch(`/api/unanswered-questions?companyId=${companyId}`)
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
      fetchEscalations()
      fetchUnansweredQuestions()
    }, 10000)
    return () => clearInterval(interval)
  }, [companyId])

  // Calculate percentage changes
  const todayChange = useMemo(() => {
    if (!stats) return { value: 0, isPositive: true }
    const yesterday = stats.conversationsYesterday || 1
    const change = ((stats.conversationsToday - yesterday) / yesterday) * 100
    return { value: Math.abs(Math.round(change)), isPositive: change >= 0 }
  }, [stats])

  const weeklyChange = useMemo(() => {
    if (!stats) return { value: 0, isPositive: true }
    const lastWeek = stats.conversationsLastWeek || 1
    const change = ((stats.conversationsThisWeek - lastWeek) / lastWeek) * 100
    return { value: Math.abs(Math.round(change)), isPositive: change >= 0 }
  }, [stats])

  const maxDailyConversations = useMemo(() => {
    if (!stats?.conversationsLast7Days) return 1
    return Math.max(...stats.conversationsLast7Days.map(d => d.count), 1)
  }, [stats])

  const totalChannels = (stats?.smsCount || 0) + (stats?.widgetCount || 0) + (stats?.instagramCount || 0) + (stats?.messengerCount || 0)
  const smsPercentage = totalChannels > 0 ? Math.round((stats?.smsCount || 0) / totalChannels * 100) : 0
  const widgetPercentage = totalChannels > 0 ? Math.round((stats?.widgetCount || 0) / totalChannels * 100) : 0
  const instagramPercentage = totalChannels > 0 ? Math.round((stats?.instagramCount || 0) / totalChannels * 100) : 0
  const messengerPercentage = totalChannels > 0 ? Math.round((stats?.messengerCount || 0) / totalChannels * 100) : 0

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-[#6B7A94]">Oversikt over Botsy sin aktivitet</p>
      </motion.div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <EnhancedStatCard
          title="Samtaler i dag"
          value={isLoading ? '...' : String(stats?.conversationsToday || 0)}
          change={todayChange.value}
          isPositive={todayChange.isPositive}
          icon={<MessageSquare className="h-5 w-5" />}
          delay={0}
        />
        <EnhancedStatCard
          title="Totale samtaler"
          value={isLoading ? '...' : String(stats?.totalConversations || 0)}
          change={weeklyChange.value}
          isPositive={weeklyChange.isPositive}
          subtitle="denne uken"
          icon={<Zap className="h-5 w-5" />}
          delay={0.1}
        />
        <EnhancedStatCard
          title="Svartid"
          value={isLoading ? '...' : `${stats?.avgResponseTime || 0}s`}
          subtitle="gjennomsnitt"
          icon={<Clock className="h-5 w-5" />}
          accentColor="blue"
          delay={0.2}
        />
        <EnhancedStatCard
          title="Tilfredshet"
          value={isLoading ? '...' : `${stats?.satisfactionRate || 0}%`}
          subtitle="fornøyde kunder"
          icon={<ThumbsUp className="h-5 w-5" />}
          accentColor="green"
          delay={0.3}
        />
      </div>

      {/* Pending Escalations */}
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
                      <p className="text-white font-medium text-sm truncate">{esc.customerIdentifier}</p>
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

      {/* Unanswered Questions Alert */}
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
                      <p className="text-white font-medium text-sm truncate">{q.customerIdentifier}</p>
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

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <QuickStatCard
          title="Mest stilte sporsmal"
          value={stats?.topQuestions?.[0]?.question || 'Ingen data'}
          subtitle={stats?.topQuestions?.[0]?.count ? `${stats.topQuestions[0].count} ganger` : ''}
          icon={<HelpCircle className="h-4 w-4" />}
        />
        <QuickStatCard
          title="Peak time"
          value={stats?.peakHour !== undefined ? `${String(stats.peakHour).padStart(2, '0')}:00` : '--:--'}
          subtitle="mest aktiv time"
          icon={<Activity className="h-4 w-4" />}
        />
        <QuickStatCard
          title="Totale meldinger"
          value={isLoading ? '...' : String(stats?.totalMessages || 0)}
          subtitle="alle kanaler"
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <QuickStatCard
          title="Aktive kanaler"
          value={String(
            ((stats?.smsCount || 0) > 0 ? 1 : 0) +
            ((stats?.widgetCount || 0) > 0 ? 1 : 0) +
            ((stats?.instagramCount || 0) > 0 ? 1 : 0) +
            ((stats?.messengerCount || 0) > 0 ? 1 : 0)
          )}
          subtitle="av 4 tilgjengelige"
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      {/* Charts and Activity Section */}
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Conversations Chart */}
        <Card className="lg:col-span-2 p-4 lg:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Samtaler siste 7 dager</h2>
              <p className="text-[#6B7A94] text-sm mt-1">Daglig oversikt</p>
            </div>
            <Badge variant="default" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {weeklyChange.isPositive ? '+' : '-'}{weeklyChange.value}%
            </Badge>
          </div>

          {/* CSS Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {stats?.conversationsLast7Days?.map((day, index) => (
              <motion.div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
                style={{ originY: 1 }}
              >
                <div className="w-full flex flex-col items-center justify-end h-36">
                  <span className="text-xs text-[#6B7A94] mb-1">{day.count}</span>
                  <motion.div
                    className="w-full max-w-[40px] bg-gradient-to-t from-botsy-lime/60 to-botsy-lime rounded-t-md relative overflow-hidden"
                    style={{ height: `${(day.count / maxDailyConversations) * 100}%`, minHeight: '8px' }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    />
                  </motion.div>
                </div>
                <span className="text-xs text-[#6B7A94] font-medium">{day.date}</span>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="p-4 lg:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Siste aktivitet</h2>
            <Sparkles className="h-4 w-4 text-botsy-lime" />
          </div>
          <div className="space-y-4">
            {stats?.recentActivity?.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ActivityFeedItem activity={activity} />
              </motion.div>
            ))}
            {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-[#6B7A94] text-sm">Ingen aktivitet enda</p>
            )}
          </div>
        </Card>
      </div>

      {/* Conversations and Top Questions */}
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 overflow-hidden">
        {/* Recent Conversations */}
        <Card className="lg:col-span-2 p-4 lg:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Nylige samtaler</h2>
            <Button variant="ghost" size="sm" onClick={onViewAllConversations}>
              Se alle
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-[#6B7A94] text-sm">Laster...</div>
            ) : stats?.recentConversations?.length === 0 ? (
              <div className="text-[#6B7A94] text-sm">Ingen samtaler ennå</div>
            ) : (
              stats?.recentConversations?.slice(0, 4).map((conv, index) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ConversationPreview
                    name={conv.name}
                    message={conv.lastMessage}
                    time={formatTimeAgo(conv.lastMessageAt)}
                    channel={conv.channel}
                    status="resolved"
                    onClick={() => onViewConversation(conv.id)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </Card>

        {/* Top Questions */}
        <Card className="p-4 lg:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Topp sporsmal</h2>
            <HelpCircle className="h-4 w-4 text-[#6B7A94]" />
          </div>
          <div className="space-y-3">
            {stats?.topQuestions?.slice(0, 5).map((q, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-botsy-lime/10 flex items-center justify-center text-botsy-lime text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{q.question}</p>
                  <p className="text-[#6B7A94] text-xs">{q.count} ganger</p>
                </div>
              </motion.div>
            ))}
            {(!stats?.topQuestions || stats.topQuestions.length === 0) && (
              <p className="text-[#6B7A94] text-sm">Ingen data ennå</p>
            )}
          </div>
        </Card>
      </div>

      {/* Channel Stats */}
      <Card className="p-4 lg:p-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-white mb-4 lg:mb-6">Samtaler per kanal</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <ChannelStat channel="SMS" count={stats?.smsCount || 0} percentage={smsPercentage} color="#CDFF4D" icon={<Phone className="h-4 w-4" />} />
          <ChannelStat channel="Widget" count={stats?.widgetCount || 0} percentage={widgetPercentage} color="#3B82F6" icon={<MessageCircle className="h-4 w-4" />} />
          <ChannelStat channel="Messenger" count={stats?.messengerCount || 0} percentage={messengerPercentage} color="#0084FF" icon={<MessageSquare className="h-4 w-4" />} />
          <ChannelStat channel="Instagram" count={stats?.instagramCount || 0} percentage={instagramPercentage} color="#E4405F" icon={<MessageCircle className="h-4 w-4" />} />
        </div>
      </Card>
    </div>
  )
}

// Enhanced Stat Card with trends and animations
function EnhancedStatCard({
  title,
  value,
  change,
  isPositive,
  subtitle,
  icon,
  accentColor = 'lime',
  delay = 0,
}: {
  title: string
  value: string
  change?: number
  isPositive?: boolean
  subtitle?: string
  icon: React.ReactNode
  accentColor?: 'lime' | 'blue' | 'green'
  delay?: number
}) {
  const colorClasses = {
    lime: {
      bg: 'bg-botsy-lime/10',
      text: 'text-botsy-lime',
      glow: 'shadow-[0_0_20px_rgba(205,255,77,0.1)]',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]',
    },
    green: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.1)]',
    },
  }

  const colors = colorClasses[accentColor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className={`p-5 hover:${colors.glow} transition-shadow duration-300`}>
        <div className="flex items-start justify-between mb-3">
          <motion.div
            className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text}`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {icon}
          </motion.div>
          {change !== undefined && (
            <motion.div
              className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.2 }}
            >
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span className="font-medium">{change}%</span>
            </motion.div>
          )}
        </div>
        <motion.p
          className="text-2xl font-bold text-white mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1 }}
        >
          {value}
        </motion.p>
        <p className="text-[#6B7A94] text-sm">{title}</p>
        {subtitle && <p className="text-[#4A5568] text-xs mt-0.5">{subtitle}</p>}
      </Card>
    </motion.div>
  )
}

// Quick Stat Card (smaller, for secondary metrics)
function QuickStatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
}) {
  return (
    <Card className="p-4 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-md bg-white/[0.05] flex items-center justify-center text-[#6B7A94]">
          {icon}
        </div>
        <p className="text-xs text-[#6B7A94] truncate">{title}</p>
      </div>
      <p className="text-lg font-semibold text-white truncate">{value}</p>
      {subtitle && <p className="text-xs text-[#4A5568] mt-0.5">{subtitle}</p>}
    </Card>
  )
}

// Activity Feed Item
function ActivityFeedItem({ activity }: { activity: DashboardStats['recentActivity'][0] }) {
  const typeConfig = {
    new_conversation: {
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      color: 'text-botsy-lime',
      bg: 'bg-botsy-lime/10',
    },
    escalation: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    resolution: {
      icon: <CheckCheck className="h-3.5 w-3.5" />,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    feedback: {
      icon: <ThumbsUp className="h-3.5 w-3.5" />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  }

  const config = typeConfig[activity.type]

  return (
    <div className="flex items-start gap-3 group">
      <div className={`h-7 w-7 rounded-lg ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{activity.message}</p>
        <p className="text-[#4A5568] text-xs">{formatTimeAgo(activity.timestamp)}</p>
      </div>
    </div>
  )
}

// Conversation Preview
function ConversationPreview({
  name,
  message,
  time,
  channel,
  status,
  onClick,
}: {
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
    widget: '#3B82F6',
  }

  const statusConfig = {
    resolved: { color: 'text-green-400', icon: <CheckCheck className="h-4 w-4" /> },
    pending: { color: 'text-yellow-400', icon: <Clock className="h-4 w-4" /> },
    escalated: { color: 'text-red-400', icon: <AlertCircle className="h-4 w-4" /> },
  }

  return (
    <motion.div
      onClick={onClick}
      className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all cursor-pointer group"
      whileHover={{ x: 4 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium text-xs sm:text-sm flex-shrink-0 group-hover:bg-white/[0.15] transition-colors">
        {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white font-medium text-sm truncate">{name}</p>
          <motion.span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: channelColors[channel] }}
            whileHover={{ scale: 1.5 }}
          />
        </div>
        <p className="text-[#6B7A94] text-xs sm:text-sm truncate">{message}</p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <p className="text-[#6B7A94] text-xs mb-1">{time}</p>
        <span className={`${statusConfig[status].color} flex justify-end opacity-70 group-hover:opacity-100 transition-opacity`}>
          {statusConfig[status].icon}
        </span>
      </div>
    </motion.div>
  )
}

// Channel Stat with animation
function ChannelStat({
  channel,
  count,
  percentage,
  color,
  icon,
}: {
  channel: string
  count: number
  percentage: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <motion.div
      className="p-4 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-colors"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
            {icon}
          </div>
          <p className="text-white font-medium text-sm">{channel}</p>
        </div>
        <span className="text-[#6B7A94] text-sm font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[#6B7A94] text-xs">{count} samtaler</p>
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

  if (diffMins < 1) return 'Na'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`
  if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'er' : ''} siden`

  return dateObj.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}
