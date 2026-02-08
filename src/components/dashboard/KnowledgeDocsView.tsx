'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  File,
  BookOpen,
  ListChecks,
  Shield,
  Info,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { authFetch } from '@/lib/auth-fetch'
import type { KnowledgeDocument } from '@/types'

interface KnowledgeDocsViewProps {
  companyId: string
  userId?: string
}

export function KnowledgeDocsView({ companyId, userId }: KnowledgeDocsViewProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await authFetch(`/api/knowledge/upload?companyId=${companyId}`)
      const data = await response.json()

      if (data.success) {
        setDocuments(data.documents)
      }
    } catch {
      toast.error('Feil', 'Kunne ikke hente dokumenter')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, toast])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    setIsUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('companyId', companyId)
      formData.append('uploadedBy', userId || 'unknown')

      setUploadProgress(30)

      const response = await authFetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(70)

      const data = await response.json()

      if (data.success) {
        setUploadProgress(100)
        toast.success('Dokument lastet opp', `"${file.name}" ble analysert og lagt til`)
        fetchDocuments()
      } else {
        toast.error('Opplasting feilet', data.error || 'Kunne ikke laste opp dokumentet')
      }
    } catch {
      toast.error('Feil', 'Noe gikk galt under opplasting')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = (documentId: string) => {
    setDeleteTarget(documentId)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      const response = await authFetch(
        `/api/knowledge/upload?companyId=${companyId}&documentId=${deleteTarget}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (data.success) {
        toast.success('Dokument slettet', 'Dokumentet ble fjernet fra kunnskapsbasen')
        fetchDocuments()
      } else {
        toast.error('Feil', data.error || 'Kunne ikke slette dokumentet')
      }
    } catch (error) {
      toast.error('Feil', 'Noe gikk galt')
    }

    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: KnowledgeDocument['status']) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            <Check className="h-3 w-3 mr-1" />
            Klar
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Analyserer...
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Feil
          </Badge>
        )
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-400" />
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-400" />
      case 'txt':
      case 'md':
        return <File className="h-5 w-5 text-[#6B7A94]" />
      default:
        return <File className="h-5 w-5 text-[#6B7A94]" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Kunnskapsdokumenter</h1>
          <p className="text-[#6B7A94]">
            Last opp dokumenter med FAQs, regler og informasjon som Botsy skal lære
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Oppdater
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            {isUploading ? 'Laster opp...' : 'Last opp dokument'}
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Loader2 className="h-5 w-5 text-botsy-lime animate-spin" />
            <div className="flex-1">
              <p className="text-white text-sm mb-2">Laster opp og analyserer dokument...</p>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-botsy-lime"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-4 bg-botsy-lime/5 border-botsy-lime/20">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-botsy-lime flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-medium mb-1">Slik fungerer det</p>
            <p className="text-[#A8B4C8] text-sm">
              Last opp PDF, TXT, MD eller DOCX-filer med informasjon om bedriften din.
              Botsy analyserer innholdet og bruker det til å svare kunder mer presist.
              Filer kan inneholde FAQs, bedriftsregler, retningslinjer, priser og annen viktig info.
            </p>
          </div>
        </div>
      </Card>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 text-botsy-lime animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-[#6B7A94]" />
          </div>
          <h3 className="text-white font-medium mb-2">Ingen dokumenter ennå</h3>
          <p className="text-[#6B7A94] text-sm mb-6 max-w-md mx-auto">
            Last opp et dokument med FAQs, regler eller annen informasjon som Botsy skal bruke når den svarer kunder.
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            Last opp første dokument
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.03] flex items-center justify-center">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium truncate">{doc.fileName}</p>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center gap-3 text-[#6B7A94] text-sm">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                      {doc.status === 'ready' && doc.analyzedData && (
                        <>
                          <span>•</span>
                          <span>{doc.analyzedData.faqs.length} FAQs</span>
                          <span>•</span>
                          <span>{doc.analyzedData.rules.length} regler</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(doc.id)
                      }}
                      className="p-2 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Slett"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="p-2 text-[#6B7A94]">
                      {expandedDoc === doc.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedDoc === doc.id && doc.status === 'ready' && doc.analyzedData && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-4">
                      {/* Summary */}
                      {doc.analyzedData.summary && (
                        <div className="p-3 bg-white/[0.02] rounded-xl">
                          <p className="text-[#A8B4C8] text-sm">{doc.analyzedData.summary}</p>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                          <BookOpen className="h-5 w-5 text-botsy-lime mx-auto mb-1" />
                          <p className="text-white font-semibold">{doc.analyzedData.faqs.length}</p>
                          <p className="text-[#6B7A94] text-xs">FAQs</p>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                          <ListChecks className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                          <p className="text-white font-semibold">{doc.analyzedData.rules.length}</p>
                          <p className="text-[#6B7A94] text-xs">Regler</p>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                          <Shield className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                          <p className="text-white font-semibold">{doc.analyzedData.policies.length}</p>
                          <p className="text-[#6B7A94] text-xs">Policies</p>
                        </div>
                        <div className="p-3 bg-white/[0.02] rounded-xl text-center">
                          <Info className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                          <p className="text-white font-semibold">{doc.analyzedData.importantInfo.length}</p>
                          <p className="text-[#6B7A94] text-xs">Viktig info</p>
                        </div>
                      </div>

                      {/* FAQs */}
                      {doc.analyzedData.faqs.length > 0 && (
                        <div>
                          <p className="text-white text-sm font-medium mb-2">FAQs funnet:</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {doc.analyzedData.faqs.map((faq, i) => (
                              <div key={i} className="p-3 bg-white/[0.02] rounded-lg">
                                <p className="text-white text-sm font-medium mb-1">Q: {faq.question}</p>
                                <p className="text-[#A8B4C8] text-sm">A: {faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rules */}
                      {doc.analyzedData.rules.length > 0 && (
                        <div>
                          <p className="text-white text-sm font-medium mb-2">Regler:</p>
                          <ul className="space-y-1">
                            {doc.analyzedData.rules.map((rule, i) => (
                              <li key={i} className="text-[#A8B4C8] text-sm flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                {rule}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Policies */}
                      {doc.analyzedData.policies.length > 0 && (
                        <div>
                          <p className="text-white text-sm font-medium mb-2">Retningslinjer:</p>
                          <ul className="space-y-1">
                            {doc.analyzedData.policies.map((policy, i) => (
                              <li key={i} className="text-[#A8B4C8] text-sm flex items-start gap-2">
                                <span className="text-purple-400">•</span>
                                {policy}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Important Info */}
                      {doc.analyzedData.importantInfo.length > 0 && (
                        <div>
                          <p className="text-white text-sm font-medium mb-2">Viktig informasjon:</p>
                          <ul className="space-y-1">
                            {doc.analyzedData.importantInfo.map((info, i) => (
                              <li key={i} className="text-[#A8B4C8] text-sm flex items-start gap-2">
                                <span className="text-orange-400">•</span>
                                {info}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error State */}
              {doc.status === 'error' && doc.errorMessage && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm">{doc.errorMessage}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Slett dokument?"
        description="Er du sikker på at du vil slette dette dokumentet? Botsy vil ikke lenger ha tilgang til informasjonen i det."
        confirmText="Slett"
        variant="danger"
      />
    </div>
  )
}
