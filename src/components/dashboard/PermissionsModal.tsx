'use client'

import { useState } from 'react'
import { Shield, User, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { TeamMember, EmployeePermissions, AdminPermissions, UserRole } from '@/types'

interface PermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember
  onSuccess: () => void
  isOwner: boolean
}

export function PermissionsModal({ isOpen, onClose, member, onSuccess, isOwner }: PermissionsModalProps) {
  const toast = useToast()

  const [role, setRole] = useState<'admin' | 'employee'>(
    member.membership.role === 'owner' ? 'admin' : member.membership.role
  )
  const [employeePermissions, setEmployeePermissions] = useState<EmployeePermissions>({
    knowledgebase: (member.membership.permissions as EmployeePermissions)?.knowledgebase ?? true,
    documents: (member.membership.permissions as EmployeePermissions)?.documents ?? true,
    instructions: (member.membership.permissions as EmployeePermissions)?.instructions ?? false,
    analytics: (member.membership.permissions as EmployeePermissions)?.analytics ?? false,
    adminBot: (member.membership.permissions as EmployeePermissions)?.adminBot ?? false,
    employees: (member.membership.permissions as EmployeePermissions)?.employees ?? false,
  })
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    channels: (member.membership.permissions as AdminPermissions)?.channels ?? true,
    employees: (member.membership.permissions as AdminPermissions)?.employees ?? true,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/memberships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: member.membership.id,
          updates: {
            role,
            permissions: role === 'employee' ? employeePermissions : adminPermissions,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update permissions')
      }

      toast.success('Tilganger oppdatert', 'Endringene ble lagret')
      onSuccess()
      onClose()
    } catch {
      toast.error('Kunne ikke oppdatere', 'Prøv igjen senere')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleEmployeePermission = (key: keyof EmployeePermissions) => {
    setEmployeePermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getRoleIcon = (r: UserRole) => {
    switch (r) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-400" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-400" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rediger tilganger"
      size="sm"
    >
      <div className="space-y-4">
        {/* Member Info - Compact */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
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
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium text-sm truncate">{member.user.displayName || 'Ukjent bruker'}</p>
            <p className="text-[#6B7A94] text-xs truncate">{member.user.email}</p>
          </div>
        </div>

        {/* Role Selection - Compact */}
        <div>
          <label className="text-white text-xs font-medium block mb-2">Rolle</label>
          <div className="grid grid-cols-2 gap-2">
            {isOwner && (
              <button
                onClick={() => setRole('admin')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  role === 'admin'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Shield className={`h-4 w-4 ${role === 'admin' ? 'text-blue-400' : 'text-[#6B7A94]'}`} />
                  <span className={`text-sm font-medium ${role === 'admin' ? 'text-blue-400' : 'text-white'}`}>
                    Admin
                  </span>
                </div>
              </button>
            )}
            <button
              onClick={() => setRole('employee')}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                role === 'employee'
                  ? 'border-botsy-lime bg-botsy-lime/10'
                  : 'border-white/[0.08] hover:border-white/[0.16]'
              } ${!isOwner ? 'col-span-2' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <User className={`h-4 w-4 ${role === 'employee' ? 'text-botsy-lime' : 'text-[#6B7A94]'}`} />
                <span className={`text-sm font-medium ${role === 'employee' ? 'text-botsy-lime' : 'text-white'}`}>
                  Ansatt
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Permissions - Compact grid */}
        <div>
          <label className="text-white text-xs font-medium block mb-2">Tilganger</label>
          {role === 'employee' ? (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'knowledgebase' as const, label: 'Kunnskapsbase' },
                { key: 'documents' as const, label: 'Dokumenter' },
                { key: 'instructions' as const, label: 'Instruksjoner' },
                { key: 'analytics' as const, label: 'Analyser' },
                { key: 'adminBot' as const, label: 'Admin Bot' },
                { key: 'employees' as const, label: 'Ansatte' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleEmployeePermission(key)}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    employeePermissions[key]
                      ? 'border-botsy-lime/50 bg-botsy-lime/5'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <span className="text-white text-xs">{label}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    employeePermissions[key]
                      ? 'bg-botsy-lime border-botsy-lime'
                      : 'border-white/20'
                  }`}>
                    {employeePermissions[key] && (
                      <svg className="w-2.5 h-2.5 text-botsy-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[#6B7A94] text-xs mb-2">Full tilgang unntatt Innstillinger</p>
              {[
                { key: 'channels' as const, label: 'Kanaler' },
                { key: 'employees' as const, label: 'Ansatte' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAdminPermissions(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${
                    adminPermissions[key]
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <span className="text-white text-xs">{label}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    adminPermissions[key]
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-white/20'
                  }`}>
                    {adminPermissions[key] && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading} className="flex-1">
            {isLoading ? 'Lagrer...' : 'Lagre'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
