'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  User,
  X,
  Settings,
  Trash2,
} from 'lucide-react'
import { Button } from './button'

export interface Notification {
  id: string
  type: 'message' | 'alert' | 'success' | 'info' | 'update'
  title: string
  description?: string
  time: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationPanelProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      case 'alert':
        return <AlertCircle className="h-4 w-4" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      case 'update':
        return <Zap className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500/20 text-blue-400'
      case 'alert':
        return 'bg-red-500/20 text-red-400'
      case 'success':
        return 'bg-green-500/20 text-green-400'
      case 'info':
        return 'bg-purple-500/20 text-purple-400'
      case 'update':
        return 'bg-botsy-lime/20 text-botsy-lime'
      default:
        return 'bg-white/10 text-white'
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Nå'
    if (diffMins < 60) return `${diffMins} min siden`
    if (diffHours < 24) return `${diffHours}t siden`
    if (diffDays < 7) return `${diffDays}d siden`

    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#A8B4C8] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
        title="Varsler"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-botsy-lime rounded-full flex items-center justify-center">
            {unreadCount > 9 ? (
              <span className="text-[8px] font-bold text-botsy-dark">9+</span>
            ) : null}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">Varsler</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-botsy-lime/20 text-botsy-lime text-xs font-medium rounded-full">
                    {unreadCount} nye
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={onMarkAllAsRead}
                      className="p-1.5 text-[#6B7A94] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                      title="Merk alle som lest"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={onClearAll}
                      className="p-1.5 text-[#6B7A94] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Slett alle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="h-12 w-12 mx-auto rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
                    <Bell className="h-6 w-6 text-[#6B7A94]" />
                  </div>
                  <p className="text-[#6B7A94] text-sm">Ingen varsler</p>
                  <p className="text-[#4A5568] text-xs mt-1">Du er helt oppdatert!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group ${
                        !notification.read ? 'bg-botsy-lime/[0.02]' : ''
                      }`}
                      onClick={() => {
                        onMarkAsRead(notification.id)
                        notification.action?.onClick()
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${notification.read ? 'text-[#A8B4C8]' : 'text-white'}`}>
                              {notification.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(notification.id)
                              }}
                              className="p-1 text-[#4A5568] hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {notification.description && (
                            <p className="text-[#6B7A94] text-xs mt-0.5 line-clamp-2">
                              {notification.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[#4A5568] text-xs">
                              {formatTime(notification.time)}
                            </span>
                            {notification.action && (
                              <span className="text-botsy-lime text-xs font-medium">
                                {notification.action.label} →
                              </span>
                            )}
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-botsy-lime flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm text-[#6B7A94] hover:text-white transition-colors"
                >
                  Lukk varsler
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simple notification bell with empty state
export function SimpleNotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#A8B4C8] hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
        title="Varsler"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-botsy-lime rounded-full" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-white font-semibold">Varsler</h3>
            </div>
            <div className="py-10 text-center">
              <div className="h-14 w-14 mx-auto rounded-full bg-gradient-to-br from-botsy-lime/20 to-botsy-lime/5 flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-botsy-lime" />
              </div>
              <p className="text-white font-medium">Alt er oppdatert!</p>
              <p className="text-[#6B7A94] text-sm mt-1">Ingen nye varsler akkurat nå</p>
            </div>
            <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
              <p className="text-[#4A5568] text-xs text-center">
                Varsler om nye meldinger og oppdateringer vises her
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
