'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Tag,
  Clock,
  FileText,
  Megaphone,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { Instruction, InstructionCategory, InstructionPriority } from '@/types'

interface InstructionsViewProps {
  companyId: string
  instructions: Instruction[]
  onInstructionsChange: () => void
}

const categoryConfig: Record<InstructionCategory, {
  label: string
  icon: React.ElementType
  gradient: string
  borderColor: string
  iconColor: string
}> = {
  promotion: {
    label: 'Kampanje',
    icon: Megaphone,
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-500/30 hover:border-amber-500/50',
    iconColor: 'text-amber-400',
  },
  availability: {
    label: 'Tilgjengelighet',
    icon: Clock,
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    borderColor: 'border-blue-500/30 hover:border-blue-500/50',
    iconColor: 'text-blue-400',
  },
  policy: {
    label: 'Policy',
    icon: FileText,
    gradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    borderColor: 'border-purple-500/30 hover:border-purple-500/50',
    iconColor: 'text-purple-400',
  },
  general: {
    label: 'Generelt',
    icon: Tag,
    gradient: 'from-slate-500/20 via-slate-400/10 to-transparent',
    borderColor: 'border-slate-500/30 hover:border-slate-500/50',
    iconColor: 'text-slate-400',
  },
}

const priorityConfig: Record<InstructionPriority, {
  label: string
  dotColor: string
  bgColor: string
}> = {
  high: { label: 'Høy', dotColor: 'bg-red-400', bgColor: 'bg-red-500/10' },
  medium: { label: 'Medium', dotColor: 'bg-yellow-400', bgColor: 'bg-yellow-500/10' },
  low: { label: 'Lav', dotColor: 'bg-slate-400', bgColor: 'bg-slate-500/10' },
}

export function InstructionsView({ companyId, instructions, onInstructionsChange }: InstructionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<InstructionCategory | 'all'>('all')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const toast = useToast()

  const filteredInstructions = instructions.filter(inst => {
    const matchesSearch = inst.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || inst.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleDelete = (instructionId: string) => {
    setDeleteTarget(instructionId)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(
        `/api/instructions?companyId=${companyId}&instructionId=${deleteTarget}`,
        { method: 'DELETE' }
      )
      if (response.ok) {
        onInstructionsChange()
        toast.success('Instruks slettet', 'Instruksen ble fjernet')
      }
    } catch {
      toast.error('Kunne ikke slette', 'Noe gikk galt. Prøv igjen.')
    }
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  const handleToggleActive = async (instruction: Instruction) => {
    try {
      const response = await fetch('/api/instructions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          instructionId: instruction.id,
          updates: { isActive: !instruction.isActive },
        }),
      })
      if (response.ok) {
        onInstructionsChange()
      }
    } catch {
      // Silent fail - UI will show stale state
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Instruksjoner</h1>
          <p className="text-[#6B7A94]">Administrer hva Botsy skal huske og formidle</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4" />
          Ny instruks
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
        <input
          type="text"
          placeholder="Søk i instruksjoner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            categoryFilter === 'all'
              ? 'bg-botsy-lime/10 text-botsy-lime'
              : 'bg-white/[0.03] text-[#A8B4C8] hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          Alle ({instructions.length})
        </button>

        {(Object.keys(categoryConfig) as InstructionCategory[]).map((cat) => {
          const count = instructions.filter(i => i.category === cat).length
          const config = categoryConfig[cat]
          const Icon = config.icon
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                categoryFilter === cat
                  ? 'bg-botsy-lime/10 text-botsy-lime'
                  : 'bg-white/[0.03] text-[#A8B4C8] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${config.iconColor}`} />
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Add New Instruction Form Modal */}
      <AnimatePresence mode="wait">
        {isAdding && (
          <InstructionForm
            companyId={companyId}
            onClose={() => setIsAdding(false)}
            onSave={onInstructionsChange}
          />
        )}
      </AnimatePresence>

      {/* Instructions List */}
      {filteredInstructions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-[#6B7A94]" />
          </div>
          <p className="text-white font-medium mb-2">Ingen instruksjoner ennå</p>
          <p className="text-[#6B7A94] text-sm mb-4">
            Legg til instruksjoner for å fortelle Botsy hva den skal huske
          </p>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" />
            Legg til instruks
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInstructions.map((instruction) => (
            <InstructionCard
              key={instruction.id}
              instruction={instruction}
              onDelete={() => handleDelete(instruction.id)}
              onToggleActive={() => handleToggleActive(instruction)}
              onEdit={() => setEditingId(instruction.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence mode="wait">
        {editingId && (
          <InstructionForm
            companyId={companyId}
            instruction={instructions.find(i => i.id === editingId)}
            onClose={() => setEditingId(null)}
            onSave={onInstructionsChange}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Slett instruks?"
        description="Er du sikker på at du vil slette denne instruksen? Botsy vil ikke lenger følge denne regelen."
        confirmText="Slett"
        variant="danger"
      />
    </div>
  )
}

function InstructionCard({
  instruction,
  onDelete,
  onToggleActive,
  onEdit,
}: {
  instruction: Instruction
  onDelete: () => void
  onToggleActive: () => void
  onEdit: () => void
}) {
  const config = categoryConfig[instruction.category]
  const priorityConf = priorityConfig[instruction.priority]
  const isExpired = instruction.expiresAt && new Date(instruction.expiresAt) < new Date()
  const Icon = config.icon

  return (
    <Card className={`p-5 ${!instruction.isActive || isExpired ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Icon className={`h-3 w-3 ${config.iconColor}`} />
              {config.label}
            </Badge>

            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${priorityConf.bgColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priorityConf.dotColor}`} />
              <span className="text-white/70">{priorityConf.label}</span>
            </span>

            {isExpired && (
              <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Utløpt
              </Badge>
            )}

            {instruction.expiresAt && !isExpired && (
              <span className="text-[#6B7A94] text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Utløper {formatDate(instruction.expiresAt)}
              </span>
            )}
          </div>

          <p className="text-white">{instruction.content}</p>

          <p className="text-[#6B7A94] text-xs mt-2">
            Opprettet {formatDate(instruction.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg transition-colors ${
              instruction.isActive
                ? 'text-green-400 hover:bg-green-500/10'
                : 'text-[#6B7A94] hover:bg-white/[0.05]'
            }`}
            title={instruction.isActive ? 'Deaktiver' : 'Aktiver'}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function InstructionForm({
  companyId,
  instruction,
  onClose,
  onSave,
}: {
  companyId: string
  instruction?: Instruction
  onClose: () => void
  onSave: () => void
}) {
  const [content, setContent] = useState(instruction?.content || '')
  const [category, setCategory] = useState<InstructionCategory>(instruction?.category || 'general')
  const [priority, setPriority] = useState<InstructionPriority>(instruction?.priority || 'medium')
  const [expiresAt, setExpiresAt] = useState(
    instruction?.expiresAt ? new Date(instruction.expiresAt).toISOString().split('T')[0] : ''
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)
    try {
      const method = instruction ? 'PATCH' : 'POST'
      const body = instruction
        ? {
            companyId,
            instructionId: instruction.id,
            updates: { content, category, priority, expiresAt: expiresAt ? new Date(expiresAt) : null },
          }
        : {
            companyId,
            instruction: { content, category, priority, isActive: true, expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: '' },
          }

      const response = await fetch('/api/instructions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        onSave()
        onClose()
      }
    } catch {
      // Error handling - modal stays open so user can try again
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {instruction ? 'Rediger instruks' : 'Ny instruks'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium block mb-2">Innhold</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="F.eks. 'Vi har 20% rabatt på alle vinterjakker denne uken'"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium block mb-2">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as InstructionCategory)}
                  className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
                >
                  {(Object.keys(categoryConfig) as InstructionCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryConfig[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white text-sm font-medium block mb-2">Prioritet</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as InstructionPriority)}
                  className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
                >
                  {(Object.keys(priorityConfig) as InstructionPriority[]).map((pri) => (
                    <option key={pri} value={pri}>
                      {priorityConfig[pri].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-white text-sm font-medium block mb-2">Utløpsdato (valgfritt)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-botsy-lime/50"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Avbryt
              </Button>
              <Button type="submit" disabled={isLoading || !content.trim()} className="flex-1">
                {isLoading ? 'Lagrer...' : instruction ? 'Lagre' : 'Opprett'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
