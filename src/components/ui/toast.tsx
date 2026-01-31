'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id)
    }, toast.duration || 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description })
  }, [addToast])

  const error = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description, duration: 6000 })
  }, [addToast])

  const info = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description })
  }, [addToast])

  const warning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description, duration: 5000 })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
  }

  const colors = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: 'text-green-400',
      progress: 'bg-green-400',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: 'text-red-400',
      progress: 'bg-red-400',
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-400',
      progress: 'bg-blue-400',
    },
    warning: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      icon: 'text-orange-400',
      progress: 'bg-orange-400',
    },
  }

  const style = colors[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`pointer-events-auto w-full ${style.bg} ${style.border} border backdrop-blur-xl rounded-xl shadow-xl overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <div className={`flex-shrink-0 ${style.icon}`}>
            {icons[toast.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">{toast.title}</p>
            {toast.description && (
              <p className="text-[#A8B4C8] text-xs mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 text-[#6B7A94] hover:text-white rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
        className={`h-0.5 ${style.progress} origin-left`}
      />
    </motion.div>
  )
}
