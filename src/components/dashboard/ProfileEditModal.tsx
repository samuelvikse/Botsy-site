'use client'

import { useState, useRef } from 'react'
import { Camera, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { uploadUserAvatar } from '@/lib/storage'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { user, userData } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(userData?.displayName || user?.displayName || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Ugyldig filtype', 'Bruk JPG, PNG, GIF eller WebP')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Filen er for stor', 'Maks 5MB')
      return
    }

    setAvatarFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      let newAvatarUrl: string | undefined

      // Upload avatar if a new one was selected
      if (avatarFile) {
        newAvatarUrl = await uploadUserAvatar(user.uid, avatarFile)
      }

      // Update profile
      const updates: Record<string, string | null> = {}
      const currentDisplayName = userData?.displayName || user.displayName
      if (displayName !== currentDisplayName) {
        updates.displayName = displayName
      }
      if (newAvatarUrl) {
        updates.avatarUrl = newAvatarUrl
      } else if (removeAvatar && userData?.avatarUrl) {
        updates.avatarUrl = null
      }

      if (Object.keys(updates).length > 0) {
        const response = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            updates,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update profile')
        }
      }

      toast.success('Profil oppdatert', 'Endringene dine ble lagret')
      onClose()

      // Reload the page to reflect changes
      window.location.reload()
    } catch (error) {
      toast.error('Kunne ikke oppdatere profil', error instanceof Error ? error.message : 'Prøv igjen senere')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setDisplayName(userData?.displayName || user?.displayName || '')
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatar(false)
    onClose()
  }

  // Get user initials
  const userInitials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || 'U'

  // Use our own avatarUrl from Firestore, not Firebase Auth photoURL
  const currentAvatar = removeAvatar ? null : (avatarPreview || userData?.avatarUrl)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rediger profil"
      size="md"
    >
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-botsy-lime/20 flex items-center justify-center text-botsy-lime font-bold text-2xl overflow-hidden">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitials
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-botsy-lime text-botsy-dark flex items-center justify-center shadow-lg hover:bg-botsy-lime/90 transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>

            {currentAvatar && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute top-0 right-0 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-[#6B7A94] text-xs mt-2">
            Klikk kameraet for å laste opp nytt bilde
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="text-white text-sm font-medium block mb-2">
            Navn
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7A94]" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ditt navn"
              className="w-full h-12 pl-11 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="text-white text-sm font-medium block mb-2">
            E-post
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full h-12 px-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[#6B7A94] text-sm cursor-not-allowed"
          />
          <p className="text-[#6B7A94] text-xs mt-1">
            E-post kan ikke endres
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
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
