'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
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
  Trophy,
  Medal,
  MessageCircle,
  ThumbsUp,
  LogOut,
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
import { authFetch } from '@/lib/auth-fetch'
import type { TeamMember, Invitation, OwnershipTransfer, LeaderboardEntry } from '@/types'

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardMonth, setLeaderboardMonth] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log('[EmployeesView] Fetching data for company:', companyId)

      // Fetch team members
      const membersResponse = await authFetch(`/api/memberships?companyId=${companyId}`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        console.log('[EmployeesView] Members response:', membersData)
        setMembers(membersData.members || [])
      } else {
        console.error('[EmployeesView] Failed to fetch members:', membersResponse.status)
      }

      // Fetch pending invitations
      const invitationsResponse = await authFetch(`/api/invitations?companyId=${companyId}`)
      const invitationsData = await invitationsResponse.json()
      console.log('[EmployeesView] Invitations response:', invitationsData)
      setInvitations(invitationsData.invitations || [])

      // Fetch pending ownership transfer
      const transferResponse = await authFetch(`/api/ownership-transfer?companyId=${companyId}`)
      if (transferResponse.ok) {
        const transferData = await transferResponse.json()
        console.log('[EmployeesView] Transfer response:', transferData)
        setPendingTransfer(transferData.transfer || null)
      }

      // Fetch leaderboard
      const leaderboardResponse = await authFetch(`/api/leaderboard?companyId=${companyId}&topCount=3`)
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json()
        console.log('[EmployeesView] Leaderboard response:', leaderboardData)
        setLeaderboard(leaderboardData.leaderboard || [])
        setLeaderboardMonth(leaderboardData.monthName || '')
      }
    } catch (error) {
      console.error('[EmployeesView] Error fetching data:', error)
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
      const response = await authFetch(`/api/memberships?membershipId=${selectedMember.membership.id}`, {
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
      const response = await authFetch(`/api/invitations?invitationId=${cancelInviteId}`, {
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

  const handleLeaveCompany = async () => {
    const myMembership = members.find(m => m.membership.userId === user?.uid)
    if (!myMembership || !user?.uid) return

    setActionLoading('leave')
    try {
      const response = await authFetch('/api/memberships/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          membershipId: myMembership.membership.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Du har forlatt bedriften', 'Du kan nå bli med i en annen bedrift')
        // Redirect to home/dashboard after leaving
        window.location.href = '/'
      } else {
        throw new Error(data.error || 'Failed to leave company')
      }
    } catch (error) {
      toast.error('Kunne ikke forlate bedriften', error instanceof Error ? error.message : 'Prøv igjen senere')
    } finally {
      setActionLoading(null)
      setLeaveModalOpen(false)
    }
  }

  const handleCancelTransfer = async () => {
    if (!pendingTransfer) return

    setActionLoading('transfer')
    try {
      const response = await authFetch(`/api/ownership-transfer?transferId=${pendingTransfer.id}`, {
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

  // Check if current user can leave the company (not an owner)
  const canLeaveCompany = (): boolean => {
    const myMembership = members.find(m => m.membership.userId === user?.uid)
    return !!myMembership && myMembership.membership.role !== 'owner'
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
          <p className="text-[#6B7A94]">
            {canManageTeam ? 'Administrer teammedlemmer og tilganger' : 'Se teammedlemmer og roller'}
          </p>
        </div>
        <div className="flex gap-3">
          {canLeaveCompany() && (
            <Button
              variant="outline"
              onClick={() => setLeaveModalOpen(true)}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Forlat bedrift
            </Button>
          )}
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

      {/* Competition Leaderboard */}
      <Card className="p-6 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5 border-yellow-500/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Konkurransepall</h2>
              <p className="text-[#6B7A94] text-sm">{leaderboardMonth} - Nullstilles 1. hver mnd</p>
            </div>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Medal className="h-12 w-12 text-[#6B7A94] mx-auto mb-3" />
            <p className="text-[#6B7A94]">Ingen aktivitet denne måneden ennå</p>
            <p className="text-[#6B7A94] text-sm mt-1">
              Svar kunder og få positive tilbakemeldinger for å komme på pallen!
            </p>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-4 py-6">
            {/* 2nd Place - Left */}
            {leaderboard.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  {leaderboard[1].avatarUrl ? (
                    <img
                      src={leaderboard[1].avatarUrl}
                      alt={leaderboard[1].displayName}
                      className="h-16 w-16 rounded-full object-cover border-2 border-gray-400"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-300 font-bold text-lg border-2 border-gray-400">
                      {leaderboard[1].displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center text-botsy-dark font-bold text-xs">
                    2
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-medium text-sm truncate max-w-[100px]">
                    {leaderboard[1].displayName.split(' ')[0]}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#6B7A94] mt-1">
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3" />
                      {leaderboard[1].answeredCustomers}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ThumbsUp className="h-3 w-3" />
                      {leaderboard[1].positiveFeedback}
                    </span>
                  </div>
                </div>
                <div className="mt-2 w-20 h-20 bg-gradient-to-t from-gray-500/30 to-gray-500/10 rounded-t-lg flex items-center justify-center">
                  <span className="text-gray-400 text-2xl font-bold">2</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place - Center */}
            {leaderboard.length >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center -mt-4"
              >
                <div className="relative mb-3">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Crown className="h-6 w-6 text-yellow-400" />
                  </div>
                  {leaderboard[0].avatarUrl ? (
                    <img
                      src={leaderboard[0].avatarUrl}
                      alt={leaderboard[0].displayName}
                      className="h-20 w-20 rounded-full object-cover border-2 border-yellow-400"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-300 font-bold text-xl border-2 border-yellow-400">
                      {leaderboard[0].displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-yellow-400 flex items-center justify-center text-botsy-dark font-bold text-sm">
                    1
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold truncate max-w-[120px]">
                    {leaderboard[0].displayName.split(' ')[0]}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#6B7A94] mt-1">
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3" />
                      {leaderboard[0].answeredCustomers}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ThumbsUp className="h-3 w-3" />
                      {leaderboard[0].positiveFeedback}
                    </span>
                  </div>
                  <p className="text-botsy-lime text-xs mt-1 font-medium">
                    {leaderboard[0].totalScore} poeng
                  </p>
                </div>
                <div className="mt-2 w-24 h-28 bg-gradient-to-t from-yellow-500/30 to-yellow-500/10 rounded-t-lg flex items-center justify-center">
                  <span className="text-yellow-400 text-3xl font-bold">1</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place - Right */}
            {leaderboard.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  {leaderboard[2].avatarUrl ? (
                    <img
                      src={leaderboard[2].avatarUrl}
                      alt={leaderboard[2].displayName}
                      className="h-14 w-14 rounded-full object-cover border-2 border-amber-700"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-amber-700/20 flex items-center justify-center text-amber-600 font-bold border-2 border-amber-700">
                      {leaderboard[2].displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-700 flex items-center justify-center text-white font-bold text-xs">
                    3
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-medium text-sm truncate max-w-[100px]">
                    {leaderboard[2].displayName.split(' ')[0]}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#6B7A94] mt-1">
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3" />
                      {leaderboard[2].answeredCustomers}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ThumbsUp className="h-3 w-3" />
                      {leaderboard[2].positiveFeedback}
                    </span>
                  </div>
                </div>
                <div className="mt-2 w-18 h-16 bg-gradient-to-t from-amber-700/30 to-amber-700/10 rounded-t-lg flex items-center justify-center" style={{ width: '72px' }}>
                  <span className="text-amber-700 text-xl font-bold">3</span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div className="mt-4 text-center text-xs text-[#6B7A94]">
          Poeng: 1 poeng per besvart kunde + 5 poeng per positiv tilbakemelding
        </div>
      </Card>

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
                      {member.membership.role === 'owner' && (
                        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Eier
                        </Badge>
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

      {/* Pending Invitations - Only visible to owners and admins */}
      {canManageTeam && (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Ventende invitasjoner</h2>
            {invitations.length > 0 && (
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                {invitations.length}
              </Badge>
            )}
          </div>
        </div>

        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-[#6B7A94] mx-auto mb-3" />
            <p className="text-[#6B7A94]">Ingen ventende invitasjoner</p>
            {canManageTeam && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setInviteModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Inviter noen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-colors"
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
                      {invitation.inviterName && (
                        <>
                          <span className="text-white/20">•</span>
                          <span>Invitert av {invitation.inviterName}</span>
                        </>
                      )}
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
                      title="Kanseller invitasjon"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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

      <ConfirmDialog
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onConfirm={handleLeaveCompany}
        title="Forlat bedriften?"
        description="Er du sikker på at du vil forlate denne bedriften? Du vil miste tilgang til alle data og samtaler. Du kan bli med i en ny bedrift senere hvis du blir invitert."
        confirmText="Forlat bedrift"
        variant="danger"
        isLoading={actionLoading === 'leave'}
      />
    </div>
  )
}
