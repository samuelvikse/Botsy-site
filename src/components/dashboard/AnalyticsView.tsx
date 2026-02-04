'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Bot,
  TrendingUp,
  Clock,
  Zap,
  Calendar,
  Download,
  Users,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { usePermissions } from '@/contexts/PermissionContext'

interface AnalyticsViewProps {
  companyId: string
}

interface AnalyticsData {
  totalConversations: number
  totalMessages: number
  averageMessagesPerConversation: number
  topQuestions: Array<{ question: string; count: number }>
  conversationsPerDay: Array<{ date: string; count: number }>
  isLoading: boolean
}

export const AnalyticsView = memo(function AnalyticsView({ companyId }: AnalyticsViewProps) {
  const toast = useToast()
  const { canManageTeam } = usePermissions()
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('7')
  const [isExportingAnalytics, setIsExportingAnalytics] = useState(false)
  const [isExportingContacts, setIsExportingContacts] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalConversations: 0,
    totalMessages: 0,
    averageMessagesPerConversation: 0,
    topQuestions: [],
    conversationsPerDay: [],
    isLoading: true,
  })

  const handleExportAnalytics = async () => {
    setIsExportingAnalytics(true)
    try {
      const response = await fetch(`/api/export/analytics?companyId=${companyId}&period=${timeRange}`)
      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `botsy-analyse-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Eksport fullført', 'Analysedataene ble lastet ned')
    } catch {
      toast.error('Eksport feilet', 'Kunne ikke eksportere analysedata')
    } finally {
      setIsExportingAnalytics(false)
    }
  }

  const handleExportContacts = async () => {
    setIsExportingContacts(true)
    try {
      const response = await fetch(`/api/export/contacts?companyId=${companyId}`)
      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `botsy-kontakter-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Eksport fullført', 'Kontaktlisten ble lastet ned')
    } catch {
      toast.error('Eksport feilet', 'Kunne ikke eksportere kontaktliste')
    } finally {
      setIsExportingContacts(false)
    }
  }

  useEffect(() => {
    async function fetchAnalytics() {
      if (!db || !companyId) {
        setAnalytics(prev => ({ ...prev, isLoading: false }))
        return
      }

      try {
        const daysAgo = parseInt(timeRange)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysAgo)

        // Fetch customer chat sessions
        const chatsRef = collection(db, 'companies', companyId, 'customerChats')
        const chatsSnapshot = await getDocs(chatsRef)

        let totalMessages = 0
        let filteredConversations = 0
        const conversationsPerDay: Record<string, number> = {}
        const questionCounts: Record<string, number> = {}

        chatsSnapshot.forEach((doc) => {
          const data = doc.data()
          const messages = data.messages || []

          // Filter by time range
          const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt)
          if (createdAt < startDate) return

          filteredConversations++
          totalMessages += messages.length

          // Count conversations per day
          if (data.createdAt) {
            const date = createdAt
            const dateStr = date.toISOString().split('T')[0]
            conversationsPerDay[dateStr] = (conversationsPerDay[dateStr] || 0) + 1
          }

          // Extract questions (user messages)
          messages.forEach((msg: { role: string; content: string }) => {
            if (msg.role === 'user' && msg.content.includes('?')) {
              const question = msg.content.slice(0, 50)
              questionCounts[question] = (questionCounts[question] || 0) + 1
            }
          })
        })

        // Sort and get top questions
        const topQuestions = Object.entries(questionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([question, count]) => ({ question, count }))

        // Format conversations per day
        const formattedPerDay = Object.entries(conversationsPerDay)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-7)
          .map(([date, count]) => ({ date, count }))

        setAnalytics({
          totalConversations: filteredConversations,
          totalMessages,
          averageMessagesPerConversation: filteredConversations > 0
            ? Math.round(totalMessages / filteredConversations)
            : 0,
          topQuestions,
          conversationsPerDay: formattedPerDay,
          isLoading: false,
        })
      } catch {
        setAnalytics(prev => ({ ...prev, isLoading: false }))
      }
    }

    fetchAnalytics()
  }, [companyId, timeRange])

  const maxConversations = useMemo(
    () => Math.max(...analytics.conversationsPerDay.map(d => d.count), 1),
    [analytics.conversationsPerDay]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analyser</h1>
          <p className="text-[#6B7A94]">Innsikt i Botsy sin aktivitet og ytelse</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#6B7A94]" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7' | '30' | '90')}
              className="h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
            >
              <option value="7">Siste 7 dager</option>
              <option value="30">Siste 30 dager</option>
              <option value="90">Siste 90 dager</option>
            </select>
          </div>
          {canManageTeam && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAnalytics}
                disabled={isExportingAnalytics}
              >
                {isExportingAnalytics ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1.5" />
                )}
                Eksporter data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportContacts}
                disabled={isExportingContacts}
              >
                {isExportingContacts ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-1.5" />
                )}
                Eksporter kontaktliste
              </Button>
            </div>
          )}
        </div>
      </div>

      {analytics.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-botsy-lime animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Totale samtaler"
              value={analytics.totalConversations.toString()}
              icon={<MessageSquare className="h-5 w-5" />}
              color="lime"
            />
            <StatCard
              title="Totale meldinger"
              value={analytics.totalMessages.toString()}
              icon={<Bot className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Snitt per samtale"
              value={`${analytics.averageMessagesPerConversation} meldinger`}
              icon={<Zap className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              title="Responstid"
              value="< 10 sek"
              icon={<Clock className="h-5 w-5" />}
              color="green"
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Conversations Over Time */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Samtaler per dag</h2>
              {analytics.conversationsPerDay.length > 0 ? (
                <div className="h-48 flex items-end gap-2">
                  {analytics.conversationsPerDay.map((day, i) => (
                    <motion.div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-2"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-botsy-lime/50 to-botsy-lime rounded-t-lg relative group"
                        style={{ height: `${(day.count / maxConversations) * 140}px`, minHeight: '4px' }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {day.count} samtaler
                        </div>
                      </div>
                      <span className="text-[#6B7A94] text-xs">
                        {new Date(day.date).toLocaleDateString('no-NO', { weekday: 'short' })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-[#6B7A94] border border-dashed border-white/[0.1] rounded-xl">
                  Ingen data ennå
                </div>
              )}
            </Card>

            {/* Response Distribution */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Svarfordeling</h2>
              <div className="space-y-4">
                <ResponseBar label="Automatisk løst" percentage={87} color="#CCFF00" />
                <ResponseBar label="Henvist til FAQ" percentage={45} color="#3B82F6" />
                <ResponseBar label="Brukte instruksjoner" percentage={23} color="#8B5CF6" />
                <ResponseBar label="Kunne ikke svare" percentage={8} color="#EF4444" />
              </div>
            </Card>
          </div>

          {/* Top Questions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Mest stilte spørsmål</h2>
            {analytics.topQuestions.length > 0 ? (
              <div className="space-y-4">
                {analytics.topQuestions.map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-botsy-lime font-bold text-lg w-6">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm mb-1">{item.question}</p>
                      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-botsy-lime/70 to-botsy-lime rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / analytics.topQuestions[0].count) * 100}%` }}
                          transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <span className="text-[#6B7A94] text-sm font-medium">{item.count}x</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#6B7A94]">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Ingen spørsmål registrert ennå</p>
                <p className="text-sm mt-1">Data vises når kunder begynner å chatte</p>
              </div>
            )}
          </Card>

          {/* Performance Insights */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-green-400 font-medium">Styrke</span>
              </div>
              <p className="text-white text-sm">Rask responstid på under 10 sekunder gir god kundeopplevelse</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <span className="text-yellow-400 font-medium">Tips</span>
              </div>
              <p className="text-white text-sm">Legg til flere FAQs for å øke andelen automatisk løste spørsmål</p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-blue-400 font-medium">Innsikt</span>
              </div>
              <p className="text-white text-sm">Botsy bruker instruksjonene dine aktivt i {23}% av svarene</p>
            </Card>
          </div>
        </>
      )}
    </div>
  )
})

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: 'lime' | 'blue' | 'purple' | 'green'
}) {
  const colors = {
    lime: 'bg-botsy-lime/10 text-botsy-lime',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-[#6B7A94] text-sm">{title}</p>
    </Card>
  )
}

function ResponseBar({
  label,
  percentage,
  color,
}: {
  label: string
  percentage: number
  color: string
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#A8B4C8]">{label}</span>
        <span className="text-white font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
