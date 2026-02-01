'use client'

import { useState } from 'react'
import { Crown, AlertTriangle, Copy, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import type { TeamMember } from '@/types'

interface OwnershipTransferModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  members: TeamMember[]
  onSuccess: () => void
}

export function OwnershipTransferModal({
  isOpen,
  onClose,
  companyId,
  members,
  onSuccess,
}: OwnershipTransferModalProps) {
  const { user } = useAuth()
  const toast = useToast()

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [transferCreated, setTransferCreated] = useState(false)
  const [transferUrls, setTransferUrls] = useState<{
    fromUserUrl: string
    toUserUrl: string
    expiresAt: string
  } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<'from' | 'to' | null>(null)

  const selectedMember = members.find(m => m.membership.id === selectedMemberId)

  const handleStartTransfer = async () => {
    if (!selectedMemberId || !selectedMember) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/ownership-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          fromUserId: user?.uid,
          toUserId: selectedMember.membership.userId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create transfer')
      }

      const data = await response.json()
      setTransferUrls({
        fromUserUrl: data.fromUserUrl,
        toUserUrl: data.toUserUrl,
        expiresAt: data.expiresAt,
      })
      setTransferCreated(true)
      toast.success('Overføring startet', 'Begge parter må bekrefte for å fullføre')
      onSuccess()
    } catch (error) {
      toast.error('Kunne ikke starte overføring', error instanceof Error ? error.message : 'Prøv igjen senere')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = async (type: 'from' | 'to') => {
    if (!transferUrls) return

    const url = type === 'from' ? transferUrls.fromUserUrl : transferUrls.toUserUrl

    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(type)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      toast.error('Kunne ikke kopiere', 'Prøv igjen')
    }
  }

  const handleClose = () => {
    setSelectedMemberId(null)
    setTransferCreated(false)
    setTransferUrls(null)
    setCopiedUrl(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Overfør eierskap"
      size="md"
    >
      {transferCreated && transferUrls ? (
        <div className="space-y-6">
          {/* Success State */}
          <div className="flex items-center justify-center py-4">
            <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Crown className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-white font-medium mb-2">Overføring startet!</h3>
            <p className="text-[#6B7A94] text-sm">
              Begge parter må bekrefte via sine respektive lenker for å fullføre overføringen.
            </p>
          </div>

          {/* Your Confirmation Link */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">
              Din bekreftelseslenke
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm truncate">
                {transferUrls.fromUserUrl}
              </div>
              <Button onClick={() => handleCopyUrl('from')} size="sm">
                {copiedUrl === 'from' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* New Owner's Link */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">
              Send denne til {selectedMember?.user.displayName || selectedMember?.user.email}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm truncate">
                {transferUrls.toUserUrl}
              </div>
              <Button onClick={() => handleCopyUrl('to')} size="sm">
                {copiedUrl === 'to' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-yellow-400 text-sm font-medium">Viktig</p>
                <p className="text-[#6B7A94] text-xs mt-1">
                  Lenkene utløper om 24 timer. Begge parter må bekrefte for at overføringen skal fullføres.
                  Du vil bli nedgradert til administrator etter overføringen.
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleClose} className="w-full">
            Lukk
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Warning */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-medium">Advarsel</p>
                <p className="text-[#6B7A94] text-xs mt-1">
                  Ved å overføre eierskap gir du bort full kontroll over bedriftskontoen.
                  Du vil bli nedgradert til administrator.
                </p>
              </div>
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="text-white text-sm font-medium block mb-3">
              Velg ny eier
            </label>
            {members.length === 0 ? (
              <div className="text-center py-8 text-[#6B7A94]">
                <p>Ingen teammedlemmer å overføre til</p>
                <p className="text-xs mt-1">Du må invitere noen først</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member.membership.id}
                    onClick={() => setSelectedMemberId(member.membership.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      selectedMemberId === member.membership.id
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-white/[0.08] hover:border-white/[0.16]'
                    }`}
                  >
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.displayName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-medium text-sm">
                        {member.user.displayName
                          ? member.user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                          : member.user.email?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left flex-1">
                      <p className="text-white font-medium">
                        {member.user.displayName || 'Ukjent bruker'}
                      </p>
                      <p className="text-[#6B7A94] text-sm">{member.user.email}</p>
                    </div>
                    {selectedMemberId === member.membership.id && (
                      <div className="h-6 w-6 rounded-full bg-yellow-500 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Avbryt
            </Button>
            <Button
              onClick={handleStartTransfer}
              disabled={!selectedMemberId || isLoading}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isLoading ? 'Starter...' : 'Start overføring'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
