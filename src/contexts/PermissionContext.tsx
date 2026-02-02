'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useAuth } from './AuthContext'
import type { Membership, PanelName, EmployeePermissions, AdminPermissions } from '@/types'

interface PermissionContextType {
  membership: Membership | null
  loading: boolean
  isOwner: boolean
  isAdmin: boolean
  isEmployee: boolean
  hasAccess: (panel: PanelName) => boolean
  canManageTeam: boolean
  canTransferOwnership: boolean
  refreshPermissions: () => Promise<void>
}

// Access matrix defining what each role can access
// 'configurable' means it depends on the user's individual permissions
type AccessValue = boolean | 'configurable'

const ACCESS_MATRIX: Record<PanelName, { owner: AccessValue; admin: AccessValue; employee: AccessValue }> = {
  dashboard:     { owner: true, admin: true, employee: true },
  conversations: { owner: true, admin: true, employee: true },
  knowledge:     { owner: true, admin: true, employee: 'configurable' },
  documents:     { owner: true, admin: true, employee: 'configurable' },
  instructions:  { owner: true, admin: true, employee: 'configurable' },
  widget:        { owner: true, admin: true, employee: false },
  tone:          { owner: true, admin: true, employee: false },
  channels:      { owner: true, admin: 'configurable', employee: false },
  analytics:     { owner: true, admin: true, employee: 'configurable' },
  security:      { owner: true, admin: true, employee: true },
  settings:      { owner: true, admin: false, employee: false },
  employees:     { owner: true, admin: 'configurable', employee: 'configurable' },
  adminBot:      { owner: true, admin: true, employee: 'configurable' },
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMembership = useCallback(async () => {
    if (!user || !userData?.companyId) {
      setMembership(null)
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/memberships?userId=${user.uid}&companyId=${userData.companyId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.membership) {
          setMembership(data.membership)
        } else {
          // Legacy user without membership - create one based on userData.role
          // This handles migration for existing users
          const legacyMembership: Membership = {
            id: 'legacy',
            userId: user.uid,
            companyId: userData.companyId,
            role: userData.role || 'owner',
            permissions: {},
            invitedBy: user.uid,
            joinedAt: new Date(),
            status: 'active',
          }
          setMembership(legacyMembership)
        }
      } else {
        // Fallback to legacy behavior
        const legacyMembership: Membership = {
          id: 'legacy',
          userId: user.uid,
          companyId: userData.companyId,
          role: userData.role || 'owner',
          permissions: {},
          invitedBy: user.uid,
          joinedAt: new Date(),
          status: 'active',
        }
        setMembership(legacyMembership)
      }
    } catch {
      // Fallback to legacy behavior on error
      if (userData) {
        const legacyMembership: Membership = {
          id: 'legacy',
          userId: user.uid,
          companyId: userData.companyId,
          role: userData.role || 'owner',
          permissions: {},
          invitedBy: user.uid,
          joinedAt: new Date(),
          status: 'active',
        }
        setMembership(legacyMembership)
      }
    } finally {
      setLoading(false)
    }
  }, [user, userData])

  useEffect(() => {
    fetchMembership()
  }, [fetchMembership])

  const isOwner = membership?.role === 'owner'
  const isAdmin = membership?.role === 'admin'
  const isEmployee = membership?.role === 'employee'

  const hasAccess = useCallback((panel: PanelName): boolean => {
    if (!membership) return false
    if (membership.status === 'suspended') return false

    const role = membership.role
    const accessRule = ACCESS_MATRIX[panel]?.[role]

    if (accessRule === true) return true
    if (accessRule === false) return false

    // Handle configurable access
    if (accessRule === 'configurable') {
      const permissions = membership.permissions

      if (role === 'admin') {
        const adminPerms = permissions as AdminPermissions
        if (panel === 'channels') return adminPerms.channels ?? true
        if (panel === 'employees') return adminPerms.employees ?? true
      }

      if (role === 'employee') {
        const employeePerms = permissions as EmployeePermissions
        switch (panel) {
          case 'knowledge':
            return employeePerms.knowledgebase ?? false
          case 'documents':
            return employeePerms.documents ?? false
          case 'instructions':
            return employeePerms.instructions ?? false
          case 'analytics':
            return employeePerms.analytics ?? false
          case 'adminBot':
            return employeePerms.adminBot ?? false
          case 'employees':
            return employeePerms.employees ?? false
          default:
            return false
        }
      }
    }

    return false
  }, [membership])

  const canManageTeam = isOwner || isAdmin
  const canTransferOwnership = isOwner

  const refreshPermissions = useCallback(async () => {
    setLoading(true)
    await fetchMembership()
  }, [fetchMembership])

  return (
    <PermissionContext.Provider
      value={{
        membership,
        loading,
        isOwner,
        isAdmin,
        isEmployee,
        hasAccess,
        canManageTeam,
        canTransferOwnership,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Helper hook to check if user has access to a specific panel
export function usePanelAccess(panel: PanelName): boolean {
  const { hasAccess, loading } = usePermissions()
  if (loading) return false
  return hasAccess(panel)
}
