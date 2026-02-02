'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader2 } from 'lucide-react'
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext'

export function FloatingSaveButton() {
  const { hasUnsavedChanges, isSaving, triggerSave } = useUnsavedChanges()

  return (
    <AnimatePresence>
      {hasUnsavedChanges && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: 20 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={triggerSave}
          disabled={isSaving}
          className="fixed bottom-24 right-6 sm:bottom-6 sm:right-24 z-50 flex items-center gap-2 px-5 py-3 bg-botsy-lime text-botsy-dark font-medium rounded-full shadow-lg hover:shadow-xl transition-shadow disabled:opacity-70"
          style={{
            boxShadow: '0 10px 40px -10px rgba(204, 255, 0, 0.5)',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lagrer...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Lagre endringer</span>
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
