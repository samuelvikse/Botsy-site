'use client'

import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Trash2, Info } from 'lucide-react'
import { Button } from './button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  // Mount check for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  // Don't render on server or before mount
  if (!mounted) return null

  // Use portal to render modal at document body level
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Backdrop - optimized with will-change for opacity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            style={{ willChange: 'opacity' }}
          />

          {/* Modal */}
          <div
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ willChange: 'transform, opacity' }}
              className={`w-full ${sizeClasses[size]} bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden`}
            >
              {/* Header */}
              {(title || description) && (
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      {title && (
                        <h3 id="modal-title" className="text-lg font-semibold text-white">{title}</h3>
                      )}
                      {description && (
                        <p id="modal-description" className="text-sm text-[#6B7A94] mt-1">{description}</p>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      aria-label="Lukk"
                      className="p-1.5 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className={title || description ? 'px-6 pb-6' : 'p-6'}>
                {children}
              </div>
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Confirmation Dialog
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Bekreft',
  cancelText = 'Avbryt',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const icons = {
    danger: <Trash2 className="h-6 w-6" />,
    warning: <AlertTriangle className="h-6 w-6" />,
    info: <Info className="h-6 w-6" />,
  }

  const colors = {
    danger: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: 'text-red-400',
      button: 'bg-red-500 hover:bg-red-600 text-white',
    },
    warning: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      icon: 'text-orange-400',
      button: 'bg-orange-500 hover:bg-orange-600 text-white',
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-400',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={`mx-auto h-14 w-14 rounded-full ${colors[variant].bg} ${colors[variant].border} border flex items-center justify-center mb-4`}>
          <span className={colors[variant].icon}>{icons[variant]}</span>
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        {description && (
          <p className="text-[#A8B4C8] text-sm mb-6">{description}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 ${colors[variant].button}`}
          >
            {isLoading ? 'Venter...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Input Dialog
interface InputDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title: string
  description?: string
  placeholder?: string
  initialValue?: string
  submitText?: string
  cancelText?: string
  multiline?: boolean
}

export function InputDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder = '',
  initialValue = '',
  submitText = 'Lagre',
  cancelText = 'Avbryt',
  multiline = false,
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (isOpen) setValue(initialValue)
  }, [isOpen, initialValue])

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim())
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 resize-none mb-4"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-[#6B7A94] text-sm focus:outline-none focus:border-botsy-lime/50 mb-4"
          autoFocus
        />
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          {cancelText}
        </Button>
        <Button onClick={handleSubmit} disabled={!value.trim()} className="flex-1">
          {submitText}
        </Button>
      </div>
    </Modal>
  )
}
