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
      size="md"
    >
      <div className="space-y-6">
        {/* Member Info */}
        <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl">
          {member.user.avatarUrl ? (
            <img
              src={member.user.avatarUrl}
              alt={member.user.displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-medium">
              {member.user.displayName
                ? member.user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                : member.user.email?.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-medium">{member.user.displayName || 'Ukjent bruker'}</p>
            <p className="text-[#6B7A94] text-sm">{member.user.email}</p>
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="text-white text-sm font-medium block mb-3">
            Rolle
          </label>
          <div className="grid grid-cols-2 gap-3">
            {isOwner && (
              <button
                onClick={() => setRole('admin')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  role === 'admin'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className={`h-5 w-5 ${role === 'admin' ? 'text-blue-400' : 'text-[#6B7A94]'}`} />
                  <span className={`font-medium ${role === 'admin' ? 'text-blue-400' : 'text-white'}`}>
                    Administrator
                  </span>
                </div>
                <p className="text-[#6B7A94] text-xs">
                  Full tilgang unntatt innstillinger
                </p>
              </button>
            )}

            <button
              onClick={() => setRole('employee')}
              className={`p-4 rounded-xl border text-left transition-all ${
                role === 'employee'
                  ? 'border-botsy-lime bg-botsy-lime/10'
                  : 'border-white/[0.08] hover:border-white/[0.16]'
              } ${!isOwner ? 'col-span-2' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <User className={`h-5 w-5 ${role === 'employee' ? 'text-botsy-lime' : 'text-[#6B7A94]'}`} />
                <span className={`font-medium ${role === 'employee' ? 'text-botsy-lime' : 'text-white'}`}>
                  Ansatt
                </span>
              </div>
              <p className="text-[#6B7A94] text-xs">
                Begrenset tilgang
              </p>
            </button>
          </div>
        </div>

        {/* Employee Permissions */}
        {role === 'employee' && (
          <div>
            <label className="text-white text-sm font-medium block mb-3">
              Tilganger
            </label>
            <div className="space-y-2">
              {[
                { key: 'knowledgebase' as const, label: 'Kunnskapsbase', desc: 'Administrer FAQs' },
                { key: 'documents' as const, label: 'Dokumenter', desc: 'Last opp og administrer dokumenter' },
                { key: 'instructions' as const, label: 'Instruksjoner', desc: 'Opprett og rediger instruksjoner' },
                { key: 'analytics' as const, label: 'Analyser', desc: 'Se statistikk og rapporter' },
                { key: 'adminBot' as const, label: 'Admin Bot', desc: 'Tilgang til AI-assistenten' },
                { key: 'employees' as const, label: 'Ansatte', desc: 'Se teammedlemmer (kun lesetilgang)' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => toggleEmployeePermission(key)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    employeePermissions[key]
                      ? 'border-botsy-lime/50 bg-botsy-lime/5'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-[#6B7A94] text-xs">{desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    employeePermissions[key]
                      ? 'bg-botsy-lime border-botsy-lime'
                      : 'border-white/20'
                  }`}>
                    {employeePermissions[key] && (
                      <svg className="w-3 h-3 text-botsy-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Admin Permissions */}
        {role === 'admin' && (
          <div>
            <label className="text-white text-sm font-medium block mb-3">
              Tilganger
            </label>
            <p className="text-[#6B7A94] text-sm mb-3">
              Administratorer har tilgang til alle paneler unntatt Innstillinger.
            </p>
            <div className="space-y-2">
              {[
                { key: 'channels' as const, label: 'Kanaler', desc: 'Konfigurer SMS, WhatsApp, etc.' },
                { key: 'employees' as const, label: 'Ansatte', desc: 'Administrer teammedlemmer' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setAdminPermissions(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    adminPermissions[key]
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-[#6B7A94] text-xs">{desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    adminPermissions[key]
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-white/20'
                  }`}>
                    {adminPermissions[key] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            {isLoading ? 'Lagrer...' : 'Lagre endringer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
