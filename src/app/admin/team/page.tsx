'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Shield,
  Crown,
  User,
  UserCog,
  Copy,
  Check,
  ArrowLeft,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

type TeamMember = {
  id: number
  name: string
  email: string
  role: 'owner' | 'admin' | 'employee'
  status: 'active' | 'pending'
  avatar: string
  lastActive: string
  twoFactorEnabled: boolean
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <TeamContent />
    </ProtectedRoute>
  )
}

function TeamContent() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('employee')
  const [copiedLink, setCopiedLink] = useState(false)
  const { user } = useAuth()

  // Get user initials
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: 'Samuel Vikse',
      email: 'samuel@botsy.no',
      role: 'owner',
      status: 'active',
      avatar: 'SV',
      lastActive: 'Nå',
      twoFactorEnabled: true
    },
    {
      id: 2,
      name: 'Anna Larsen',
      email: 'anna@bedrift.no',
      role: 'admin',
      status: 'active',
      avatar: 'AL',
      lastActive: '2 timer siden',
      twoFactorEnabled: true
    },
    {
      id: 3,
      name: 'Per Hansen',
      email: 'per@bedrift.no',
      role: 'employee',
      status: 'active',
      avatar: 'PH',
      lastActive: '1 dag siden',
      twoFactorEnabled: false
    },
    {
      id: 4,
      name: 'lisa@bedrift.no',
      email: 'lisa@bedrift.no',
      role: 'employee',
      status: 'pending',
      avatar: 'LB',
      lastActive: 'Aldri',
      twoFactorEnabled: false
    }
  ]

  const roleConfig = {
    owner: { label: 'Eier', color: 'bg-yellow-500/10 text-yellow-400', icon: Crown },
    admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400', icon: UserCog },
    employee: { label: 'Ansatt', color: 'bg-blue-500/10 text-blue-400', icon: User }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText('https://botsy.no/inviter/abc123')
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="min-h-screen bg-botsy-dark">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-botsy-dark-deep/50">
        <div className="container mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#6B7A94] hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Image
              src="/brand/botsy-full-logo.svg"
              alt="Botsy"
              width={100}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setShowInviteModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Inviter medlem
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/[0.06]">
              <div className="h-9 w-9 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-medium text-sm">
                {userInitials}
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-sm font-medium">{user?.displayName || 'Bruker'}</p>
                <p className="text-[#6B7A94] text-xs">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Team</h1>
          <p className="text-[#6B7A94]">Administrer hvem som har tilgang til Botsy</p>
        </div>

        {/* Role Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {Object.entries(roleConfig).map(([key, config]) => {
            const Icon = config.icon
            const count = teamMembers.filter(m => m.role === key).length
            return (
              <Card key={key} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${config.color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
                    <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-[#6B7A94] text-sm">{config.label}{count !== 1 ? 'e' : ''}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Team Members List */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
              <input
                type="text"
                placeholder="Søk etter teammedlem..."
                className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
              />
            </div>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {teamMembers.map((member) => {
              const RoleIcon = roleConfig[member.role].icon
              return (
                <div key={member.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-white/[0.1] flex items-center justify-center text-white font-medium">
                      {member.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium">{member.name}</p>
                        {member.status === 'pending' && (
                          <Badge className="bg-yellow-500/10 text-yellow-400">Venter</Badge>
                        )}
                      </div>
                      <p className="text-[#6B7A94] text-sm">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <Badge className={roleConfig[member.role].color}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleConfig[member.role].label}
                        </Badge>
                        <p className="text-[#6B7A94] text-xs mt-1">
                          {member.twoFactorEnabled && (
                            <span className="text-green-400 flex items-center gap-1 justify-end">
                              <Shield className="h-3 w-3" /> 2FA
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-[#6B7A94] text-sm">{member.lastActive}</p>
                      </div>
                      {member.role !== 'owner' && (
                        <button className="p-2 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Permissions Table */}
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tilgangsmatrise</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 text-[#6B7A94] font-medium">Tilgang</th>
                  <th className="text-center py-3 text-yellow-400 font-medium">Eier</th>
                  <th className="text-center py-3 text-purple-400 font-medium">Admin</th>
                  <th className="text-center py-3 text-blue-400 font-medium">Ansatt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  { name: 'Se meldinger', owner: true, admin: true, employee: true },
                  { name: 'Svare kunder', owner: true, admin: true, employee: true },
                  { name: 'Trene Botsy (FAQs, regler)', owner: true, admin: true, employee: false },
                  { name: 'Administrere team', owner: true, admin: true, employee: false },
                  { name: 'Se lønnsdata', owner: true, admin: true, employee: false },
                  { name: 'Redigere lønnsdata', owner: true, admin: false, employee: false },
                  { name: 'Betaling og abonnement', owner: true, admin: false, employee: false },
                  { name: 'Slette virksomhet', owner: true, admin: false, employee: false },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className="py-3 text-white">{row.name}</td>
                    <td className="py-3 text-center">
                      {row.owner ? <Check className="h-4 w-4 text-green-400 mx-auto" /> : <span className="text-[#6B7A94]">—</span>}
                    </td>
                    <td className="py-3 text-center">
                      {row.admin ? <Check className="h-4 w-4 text-green-400 mx-auto" /> : <span className="text-[#6B7A94]">—</span>}
                    </td>
                    <td className="py-3 text-center">
                      {row.employee ? <Check className="h-4 w-4 text-green-400 mx-auto" /> : <span className="text-[#6B7A94]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Inviter teammedlem</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium block mb-2">E-post</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7A94]" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="kollega@bedrift.no"
                      className="w-full h-12 pl-12 pr-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-2">Rolle</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'admin', label: 'Admin', desc: 'Full tilgang unntatt betaling' },
                      { value: 'employee', label: 'Ansatt', desc: 'Kan se og svare på meldinger' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setInviteRole(option.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          inviteRole === option.value
                            ? 'border-botsy-lime bg-botsy-lime/10'
                            : 'border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <p className="text-white font-medium mb-1">{option.label}</p>
                        <p className="text-[#6B7A94] text-xs">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-botsy-dark-surface px-4 text-[#6B7A94] text-sm">eller</span>
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm font-medium block mb-2">Invitasjonslenke</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="https://botsy.no/inviter/abc123"
                      readOnly
                      className="flex-1 h-10 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[#6B7A94] text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={copyInviteLink}>
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>
                  Avbryt
                </Button>
                <Button className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  Send invitasjon
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
