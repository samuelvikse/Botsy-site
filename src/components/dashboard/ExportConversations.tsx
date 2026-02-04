'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { auth } from '@/lib/firebase'

interface ExportConversationsProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'json' | 'csv'

export function ExportConversations({ companyId, isOpen, onClose }: ExportConversationsProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus('idle')
    setErrorMessage('')

    try {
      // Get the current user's ID token for authentication
      const user = auth?.currentUser
      if (!user) {
        throw new Error('Du må være logget inn for å eksportere')
      }

      const idToken = await user.getIdToken()

      const params = new URLSearchParams({
        companyId,
        format,
        startDate,
        endDate,
      })

      const response = await fetch(`/api/conversations/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunne ikke eksportere samtaler')
      }

      // Get the filename from the response headers or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `botsy-samtaler-${startDate}_${endDate}.${format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExportStatus('success')

      // Close after a short delay on success
      setTimeout(() => {
        onClose()
        setExportStatus('idle')
      }, 1500)
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'En feil oppstod under eksport')
    } finally {
      setIsExporting(false)
    }
  }

  // Preset date range buttons
  const setDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
          >
            <Card
              className="w-full max-w-md p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-botsy-lime/10">
                    <Download className="h-5 w-5 text-botsy-lime" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Eksporter samtaler</h2>
                    <p className="text-sm text-[#6B7A94]">Last ned samtalehistorikk</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Format Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[#A8B4C8] mb-3 block">Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormat('csv')}
                    className={`p-4 rounded-xl border transition-all ${
                      format === 'csv'
                        ? 'border-botsy-lime bg-botsy-lime/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-[#6B7A94] hover:border-white/20'
                    }`}
                  >
                    <FileSpreadsheet className={`h-6 w-6 mx-auto mb-2 ${format === 'csv' ? 'text-botsy-lime' : ''}`} />
                    <span className="text-sm font-medium">CSV</span>
                    <p className="text-xs text-[#6B7A94] mt-1">For Excel/Regneark</p>
                  </button>
                  <button
                    onClick={() => setFormat('json')}
                    className={`p-4 rounded-xl border transition-all ${
                      format === 'json'
                        ? 'border-botsy-lime bg-botsy-lime/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-[#6B7A94] hover:border-white/20'
                    }`}
                  >
                    <FileJson className={`h-6 w-6 mx-auto mb-2 ${format === 'json' ? 'text-botsy-lime' : ''}`} />
                    <span className="text-sm font-medium">JSON</span>
                    <p className="text-xs text-[#6B7A94] mt-1">For utviklere</p>
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[#A8B4C8] mb-3 block">Datoperiode</label>

                {/* Quick presets */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setDateRange(7)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-[#6B7A94] hover:text-white hover:border-white/20 transition-colors"
                  >
                    7 dager
                  </button>
                  <button
                    onClick={() => setDateRange(30)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-[#6B7A94] hover:text-white hover:border-white/20 transition-colors"
                  >
                    30 dager
                  </button>
                  <button
                    onClick={() => setDateRange(90)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-[#6B7A94] hover:text-white hover:border-white/20 transition-colors"
                  >
                    90 dager
                  </button>
                  <button
                    onClick={() => setDateRange(365)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/10 text-[#6B7A94] hover:text-white hover:border-white/20 transition-colors"
                  >
                    1 ar
                  </button>
                </div>

                {/* Date inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#6B7A94] mb-1 block">Fra</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate}
                        className="w-full h-10 pl-10 pr-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7A94] mb-1 block">Til</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full h-10 pl-10 pr-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              <AnimatePresence mode="wait">
                {exportStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-400">Eksport fullfort! Filen lastes ned...</p>
                  </motion.div>
                )}

                {exportStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2"
                  >
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting || !startDate || !endDate}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eksporterer...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Eksporter samtaler
                  </>
                )}
              </Button>

              {/* Info */}
              <p className="text-xs text-[#6B7A94] text-center mt-4">
                Inkluderer alle samtaler fra SMS, Widget, Messenger, Instagram og E-post
              </p>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
