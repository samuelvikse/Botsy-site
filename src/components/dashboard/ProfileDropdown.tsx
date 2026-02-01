'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, Settings, Edit, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionContext'
import { ProfileEditModal } from './ProfileEditModal'

interface ProfileDropdownProps {
  onNavigateToSettings?: () => void
}

export function ProfileDropdown({ onNavigateToSettings }: ProfileDropdownProps) {
  const { user, userData, signOut } = useAuth()
  const { isOwner, membership } = usePermissions()
  const [isOpen, setIsOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get display name from Firestore userData first, fallback to Firebase Auth
  const displayName = userData?.displayName || user?.displayName

  // Get user initials
  const userInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  // Use our own avatarUrl from Firestore, not Firebase Auth photoURL
  const avatarUrl = userData?.avatarUrl

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // Error handled by AuthContext
    }
  }

  const getRoleName = (role: string | undefined) => {
    switch (role) {
      case 'owner':
        return 'Eier'
      case 'admin':
        return 'Administrator'
      case 'employee':
        return 'Ansatt'
      default:
        return 'Medlem'
    }
  }

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors group w-full"
        >
          <div className="h-9 w-9 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-medium text-sm overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'Profile'}
                className="h-full w-full object-cover"
              />
            ) : (
              userInitials
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-medium truncate">{displayName || 'Bruker'}</p>
            <p className="text-[#6B7A94] text-xs truncate">{getRoleName(membership?.role)}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-[#6B7A94] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a2e] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-white text-sm font-medium truncate">{displayName || 'Bruker'}</p>
              <p className="text-[#6B7A94] text-xs truncate">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setEditModalOpen(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/[0.05] transition-colors"
              >
                <Edit className="h-4 w-4 text-[#6B7A94]" />
                Rediger profil
              </button>

              {isOwner && onNavigateToSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onNavigateToSettings()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/[0.05] transition-colors"
                >
                  <Settings className="h-4 w-4 text-[#6B7A94]" />
                  Innstillinger
                </button>
              )}

              <div className="border-t border-white/[0.06] my-1" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logg ut
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfileEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </>
  )
}
