'use client'

import { useState, useEffect } from 'react'
import {
  Globe,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { authFetch } from '@/lib/auth-fetch'
import type {
  SyncConfiguration,
  WebsiteSyncJob,
  KnowledgeConflict,
} from '@/lib/knowledge-sync/types'

interface WebsiteSyncViewProps {
  companyId: string
}

export function WebsiteSyncView({ companyId }: WebsiteSyncViewProps) {
  const [config, setConfig] = useState<Partial<SyncConfiguration>>({
    enabled: false,
    websiteUrl: '',
    syncIntervalHours: 1,
    autoApproveWebsiteFaqs: false,
    notifyOnConflicts: true,
    notifyOnNewFaqs: true,
  })
  const [recentJobs, setRecentJobs] = useState<WebsiteSyncJob[]>([])
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedConflict, setSelectedConflict] = useState<KnowledgeConflict | null>(null)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const toast = useToast()

  // Load data
  useEffect(() => {
    loadData()
  }, [companyId])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Load sync status
      const statusResponse = await authFetch(`/api/sync/status?companyId=${companyId}`)
      const statusData = await statusResponse.json()

      if (statusData.success) {
        setConfig(statusData.config || {})
        setRecentJobs(statusData.recentJobs || [])
      }

      // Load conflicts
      const conflictsResponse = await authFetch(`/api/conflicts?companyId=${companyId}&status=pending`)
      const conflictsData = await conflictsResponse.json()

      if (conflictsData.success) {
        setConflicts(conflictsData.conflicts || [])
      }
    } catch (error) {
      console.error('Error loading sync data:', error)
      toast.error('Kunne ikke laste data', 'Prøv igjen senere')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      const response = await authFetch('/api/sync/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, ...config }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Innstillinger lagret', 'Sync-konfigurasjon oppdatert')
      } else {
        throw new Error(data.error)
      }
    } catch {
      toast.error('Kunne ikke lagre', 'Prøv igjen senere')
    } finally {
      setIsSaving(false)
    }
  }

  const handleManualSync = async () => {
    if (!config.websiteUrl) {
      toast.error('Mangler URL', 'Legg inn nettside-URL først')
      return
    }

    setIsSyncing(true)
    try {
      const response = await authFetch('/api/sync/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(
          'Synkronisering fullført',
          `${data.newFaqsCreated} nye FAQs, ${data.conflictsCreated} konflikter`
        )
        loadData() // Reload data
      } else {
        throw new Error(data.errors?.[0] || 'Sync failed')
      }
    } catch (error) {
      toast.error('Synkronisering feilet', error instanceof Error ? error.message : 'Prøv igjen')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResolveConflict = async (resolution: string) => {
    if (!selectedConflict) return

    try {
      const response = await authFetch('/api/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          conflictId: selectedConflict.id,
          resolution,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Konflikt løst', 'FAQ-en ble oppdatert')
        setConflicts(prev => prev.filter(c => c.id !== selectedConflict.id))
        setConflictModalOpen(false)
        setSelectedConflict(null)
      } else {
        throw new Error(data.error)
      }
    } catch {
      toast.error('Kunne ikke løse konflikt', 'Prøv igjen')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-botsy-lime animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Nettside-synkronisering</h1>
          <p className="text-[#6B7A94]">Hold kunnskapsbasen oppdatert med innhold fra nettsiden din</p>
        </div>
        <Button onClick={handleManualSync} disabled={isSyncing || !config.websiteUrl}>
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          {isSyncing ? 'Synkroniserer...' : 'Synk nå'}
        </Button>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">{conflicts.length} konflikt{conflicts.length !== 1 ? 'er' : ''} venter på gjennomgang</p>
                <p className="text-[#A8B4C8] text-sm">Informasjon på nettsiden avviker fra kunnskapsbasen</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedConflict(conflicts[0])
                setConflictModalOpen(true)
              }}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              Gjennomgå
            </Button>
          </div>
        </Card>
      )}

      {/* Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-botsy-lime" />
          <h2 className="text-lg font-semibold text-white">Konfigurasjon</h2>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Automatisk synkronisering</p>
              <p className="text-[#6B7A94] text-sm">Synk kunnskapsbasen med nettsiden hver time</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className="text-botsy-lime"
            >
              {config.enabled ? (
                <ToggleRight className="h-8 w-8" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-[#6B7A94]" />
              )}
            </button>
          </div>

          {/* Website URL */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">Nettside-URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
                <input
                  type="url"
                  value={config.websiteUrl || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://dinfirma.no"
                  className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                />
              </div>
              {config.websiteUrl && (
                <a
                  href={config.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[#6B7A94] hover:text-white transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Auto-godkjenn FAQs</p>
                <p className="text-[#6B7A94] text-sm">Automatisk aktiver nye FAQs fra nettsiden</p>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, autoApproveWebsiteFaqs: !prev.autoApproveWebsiteFaqs }))}
                className={config.autoApproveWebsiteFaqs ? 'text-botsy-lime' : 'text-[#6B7A94]'}
              >
                {config.autoApproveWebsiteFaqs ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Varsle ved konflikter</p>
                <p className="text-[#6B7A94] text-sm">Få varsel når nettside-info avviker</p>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, notifyOnConflicts: !prev.notifyOnConflicts }))}
                className={config.notifyOnConflicts ? 'text-botsy-lime' : 'text-[#6B7A94]'}
              >
                {config.notifyOnConflicts ? (
                  <ToggleRight className="h-6 w-6" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              {isSaving ? 'Lagrer...' : 'Lagre innstillinger'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Sync Jobs */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-botsy-lime" />
          <h2 className="text-lg font-semibold text-white">Synkroniseringshistorikk</h2>
        </div>

        {recentJobs.length === 0 ? (
          <p className="text-[#6B7A94] text-sm">Ingen synkroniseringer ennå</p>
        ) : (
          <div className="space-y-2">
            {recentJobs.slice(0, 5).map(job => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {job.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : job.status === 'failed' ? (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-botsy-lime animate-spin" />
                  )}
                  <div>
                    <p className="text-white text-sm">
                      {new Date(job.startedAt).toLocaleDateString('nb-NO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {job.status === 'completed' && (
                      <p className="text-[#6B7A94] text-xs">
                        {job.newFaqsFound} nye, {job.conflictsFound} konflikter, {job.faqsMarkedOutdated} utdaterte
                      </p>
                    )}
                    {job.error && (
                      <p className="text-red-400 text-xs">{job.error}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    job.status === 'completed'
                      ? 'border-green-500/30 text-green-400'
                      : job.status === 'failed'
                      ? 'border-red-500/30 text-red-400'
                      : 'border-botsy-lime/30 text-botsy-lime'
                  }
                >
                  {job.status === 'completed' ? 'Fullført' : job.status === 'failed' ? 'Feilet' : 'Kjører'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Conflict Resolution Modal */}
      <Modal
        isOpen={conflictModalOpen}
        onClose={() => {
          setConflictModalOpen(false)
          setSelectedConflict(null)
        }}
        title="Løs konflikt"
        size="lg"
      >
        {selectedConflict && (
          <div className="space-y-4">
            <p className="text-[#A8B4C8] text-sm">
              Informasjonen på nettsiden avviker fra det som er lagret i kunnskapsbasen.
              Velg hvilken versjon du vil beholde.
            </p>

            {/* Current Version */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">Nåværende (Manuell)</Badge>
              </div>
              <p className="text-white font-medium mb-1">{selectedConflict.currentQuestion}</p>
              <p className="text-[#A8B4C8] text-sm">{selectedConflict.currentAnswer}</p>
            </div>

            {/* Website Version */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Fra nettside</Badge>
                <span className="text-xs text-[#6B7A94]">{Math.round(selectedConflict.similarityScore * 100)}% likhet</span>
              </div>
              <p className="text-white font-medium mb-1">{selectedConflict.websiteQuestion}</p>
              <p className="text-[#A8B4C8] text-sm">{selectedConflict.websiteAnswer}</p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => handleResolveConflict('keep_current')}
              >
                Behold nåværende
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveConflict('use_website')}
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                Bruk nettside
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveConflict('keep_both')}
                className="col-span-2 border-botsy-lime/30 text-botsy-lime hover:bg-botsy-lime/10"
              >
                Behold begge
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveConflict('merge')}
                className="col-span-2"
              >
                Slå sammen begge svar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveConflict('dismiss')}
                className="col-span-2 text-[#6B7A94]"
              >
                Ignorer denne konflikten
              </Button>
            </div>

            {conflicts.length > 1 && (
              <p className="text-[#6B7A94] text-xs text-center">
                {conflicts.length - 1} flere konflikter å gjennomgå
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
