'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
  saveCallback: (() => Promise<void>) | null
  setSaveCallback: (callback: (() => Promise<void>) | null) => void
  isSaving: boolean
  setIsSaving: (value: boolean) => void
  triggerSave: () => Promise<void>
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined)

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveCallback, setSaveCallbackState] = useState<(() => Promise<void>) | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Wrapper to handle React's functional update behavior for functions
  const setSaveCallback = useCallback((callback: (() => Promise<void>) | null) => {
    setSaveCallbackState(() => callback)
  }, [])

  const triggerSave = useCallback(async () => {
    if (saveCallback && !isSaving) {
      setIsSaving(true)
      try {
        await saveCallback()
        setHasUnsavedChanges(false)
      } finally {
        setIsSaving(false)
      }
    }
  }, [saveCallback, isSaving])

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        saveCallback,
        setSaveCallback,
        isSaving,
        setIsSaving,
        triggerSave,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext)
  if (context === undefined) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider')
  }
  return context
}
