'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Mail,
  MoreHorizontal,
  Crown,
  Shield,
  User,
  Settings,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { InviteModal } from './InviteModal'
import { PermissionsModal } from './PermissionsModal'
import { OwnershipTransferModal } from './OwnershipTransferModal'
import type { TeamMember, Invitation, OwnershipTransfer } from '@/types'

interface EmployeesViewProps {
  companyId: string
}

export function EmployeesView({ companyId }: EmployeesViewProps) {
  const { user } = useAuth()
  const { isOwner, isAdmin, canManageTeam } = usePermissions()
  const toast = useToast()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [pendingTransfer, setPendingTransfer] = useState<OwnershipTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch team members
      const membersResponse = await fetch(`/api/memberships?companyId=${companyId}`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.members || [])
      }

      // Fetch pending invitations
      const invitationsResponse = await fetch(`/api/invitations?companyId=${companyId}`)
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData.invitations || [])
      }

      // Fetch pending ownership transfer
      const transferResponse = await fetch(`/api/ownership-transfer?companyId=${companyId}`)
      if (transferResponse.ok) {
        const transferData = await transferResponse.json()
        setPendingTransfer(transferData.transfer || null)
      }
    } catch {
      toast.error('Kunne ikke laste data', 'Prøv å laste siden på nytt')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRemoveMember = async () => {
    if (!selectedMember) return

    setActionLoading(selectedMember.membership.id)
    try {
      const response = await fetch(`/api/memberships?membershipId=${selectedMember.membership.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Medlem fjernet', `${selectedMember.user.displayName || selectedMember.user.email} ble fjernet`)
        await fetchData()
      } else {
        throw new Error('Failed to remove member')
      }
    } catch {
      toast.error('Kunne ikke fjerne medlem', 'Prøv igjen senere')
    } finally {
      setActionLoading(null)
      setDeleteModalOpen(false)
      setSelectedMember(null)
    }
  }

  const handleCancelInvitation = async () => {
    if (!cancelInviteId) return

    setActionLoading(cancelInviteId)
    try {
      const response = await fetch(`/api/invitations?invitationId=${cancelInviteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Invitasjon kansellert', 'Invitasjonen ble kansellert')
        await fetchData()
      } else {
        throw new Error('Failed to cancel invitation')
      }
    } catch {
      toast.error('Kunne ikke kansellere', 'Prøv igjen senere')
    } finally {
      setActionLoading(null)
      setCancelInviteId(null)
    }
  }

  const handleCancelTransfer = async () => {
    if (!pendingTransfer) return

    setActionLoading('transfer')
    try {
      const response = await fetch(`/api/ownership-transfer?transferId=${pendingTransfer.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Overføring kansellert', 'Eierskapsoverføringen ble kansellert')
        await fetchData()
      } else {
        throw new Error('Failed to cancel transfer')
      }
    } catch {
      toast.error('Kunne ikke kansellere', 'Prøv igjen senere')
    } finally {
      setActionLoading(null)
    }
  }

  const openPermissionsModal = (member: TeamMember) => {
    setSelectedMember(member)
    setPermissionsModalOpen(true)
    setOpenMenuId(null)
  }

  const openDeleteModal = (member: TeamMember) => {
    setSelectedMember(member)
    setDeleteModalOpen(true)
    setOpenMenuId(null)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-400" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-400" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Eier'
      case 'admin':
        return 'Administrator'
      default:
        return 'Ansatt'
    }
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'admin':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const canManageMember = (member: TeamMember): boolean => {
    if (!canManageTeam) return false
    if (member.membership.userId === user?.uid) return false
    if (member.membership.role === 'owner') return false
    if (isAdmin && member.membership.role === 'admin') return false
    return true
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#6B7A94]">Laster teammedlemmer...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Ansatte</h1>
          <p className="text-[#6B7A94]">Administrer teammedlemmer og tilganger</p>
        </div>
        <div className="flex gap-3">
          {isOwner && (
            <Button variant="outline" onClick={() => setTransferModalOpen(true)}>
              <Crown className="h-4 w-4 mr-1.5" />
              Overfør eierskap
            </Button>
          )}
          {canManageTeam && (
            <Button onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Inviter
            </Button>
          )}
        </div>
      </div>

      {/* Pending Ownership Transfer Banner */}
      {pendingTransfer && (
        <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-medium">Pågående eierskapsoverføring</p>
                <p className="text-[#6B7A94] text-sm">
                  Venter på bekreftelse fra begge parter. Utløper{' '}
                  {new Date(pendingTransfer.expiresAt).toLocaleString('nb-NO')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingTransfer.fromUserConfirmed && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Eier bekreftet
                </Badge>
              )}
              {pendingTransfer.toUserConfirmed && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mottaker bekreftet
                </Badge>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelTransfer}
                  disabled={actionLoading === 'transfer'}
                >
                  <X className="h-4 w-4 mr-1" />
                  Kanseller
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Team Members */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Teammedlemmer</h2>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-[#6B7A94] mx-auto mb-3" />
            <p className="text-[#6B7A94]">Ingen teammedlemmer ennå</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.membership.id}
                className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-4">
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
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">
                        {member.user.displayName || 'Ukjent bruker'}
                      </p>
                      {member.membership.userId === user?.uid && (
                        <Badge variant="outline" className="text-xs">Deg</Badge>
                      )}
                    </div>
                    <p className="text-[#6B7A94] text-sm">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={`${getRoleBadgeStyle(member.membership.role)} flex items-center gap-1.5`}>
                    {getRoleIcon(member.membership.role)}
                    {getRoleName(member.membership.role)}
                  </Badge>

                  {canManageMember(member) && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === member.membership.id ? null : member.membership.id)}
                        className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openMenuId === member.membership.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a2e] border border-white/[0.08] rounded-xl shadow-xl z-50 py-1">
                            <button
                              onClick={() => openPermissionsModal(member)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/[0.05] transition-colors"
                            >
                              <Settings className="h-4 w-4" />
                              Endre tilganger
                            </button>
                            <button
                              onClick={() => openDeleteModal(member)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Fjern fra team
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Ventende invitasjoner</h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{invitation.email}</p>
                    <div className="flex items-center gap-2 text-[#6B7A94] text-sm">
                      <Clock className="h-3 w-3" />
                      <span>
                        Utløper {new Date(invitation.expiresAt).toLocaleDateString('nb-NO')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeStyle(invitation.role)}>
                    {getRoleName(invitation.role)}
                  </Badge>

                  {canManageTeam && (
                    <button
                      onClick={() => setCancelInviteId(invitation.id)}
                      disabled={actionLoading === invitation.id}
                      className="p-2 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        companyId={companyId}
        onSuccess={fetchData}
        isOwner={isOwner}
      />

      {selectedMember && (
        <PermissionsModal
          isOpen={permissionsModalOpen}
          onClose={() => {
            setPermissionsModalOpen(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
          onSuccess={fetchData}
          isOwner={isOwner}
        />
      )}

      <OwnershipTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        companyId={companyId}
        members={members.filter(m => m.membership.role !== 'owner')}
        onSuccess={fetchData}
      />

      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedMember(null)
        }}
        onConfirm={handleRemoveMember}
        title="Fjern teammedlem?"
        description={`Er du sikker på at du vil fjerne ${selectedMember?.user.displayName || selectedMember?.user.email} fra teamet? De vil miste all tilgang.`}
        confirmText="Fjern"
        variant="danger"
        isLoading={actionLoading === selectedMember?.membership.id}
      />

      <ConfirmDialog
        isOpen={!!cancelInviteId}
        onClose={() => setCancelInviteId(null)}
        onConfirm={handleCancelInvitation}
        title="Kanseller invitasjon?"
        description="Er du sikker på at du vil kansellere denne invitasjonen?"
        confirmText="Kanseller"
        variant="warning"
        isLoading={!!cancelInviteId && actionLoading === cancelInviteId}
      />
    </div>
  )
}
