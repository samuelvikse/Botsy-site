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
import { useToast } from './toast'

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
            className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
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

// Simple notification bell with push notification toggle
export function SimpleNotificationBell({
  companyId,
  onViewConversation
}: {
  companyId?: string
  onViewConversation?: (conversationId: string, channel: string) => void
}) {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [escalations, setEscalations] = useState<Array<{
    id: string
    customerIdentifier: string
    customerMessage: string
    channel: string
    createdAt: Date
    conversationId: string
  }>>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const previousEscalationIds = useRef<Set<string>>(new Set())

  // Check push notification status on mount and after a delay
  useEffect(() => {
    checkPushStatus()
    // Re-check after service worker might be ready
    const timeout = setTimeout(checkPushStatus, 1000)
    return () => clearTimeout(timeout)
  }, [])

  // Fetch escalations when companyId is available
  useEffect(() => {
    if (!companyId) return

    fetchEscalations()

    // Poll for escalations every 10 seconds (faster for real-time feel)
    const interval = setInterval(fetchEscalations, 10000)
    return () => clearInterval(interval)
  }, [companyId])

  const checkPushStatus = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        setPushEnabled(!!subscription)
      }
    } catch (error) {
      console.error('Error checking push status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEscalations = async () => {
    if (!companyId) return

    try {
      const response = await fetch(`/api/escalations?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        const newEscalations = data.escalations || [] as Array<{
          id: string
          customerIdentifier: string
          customerMessage: string
          channel: string
          createdAt: Date
          conversationId: string
        }>

        // Check for new escalations and show toast
        const currentIds = new Set<string>(newEscalations.map((e: { id: string }) => e.id))
        const newIds = newEscalations.filter((e: { id: string }) => !previousEscalationIds.current.has(e.id))

        // Only show toast if we had previous data (not on initial load)
        if (previousEscalationIds.current.size > 0 && newIds.length > 0) {
          for (const esc of newIds) {
            const message = esc.customerMessage || 'Kunde trenger assistanse'
            toast.warning(
              'Kunde trenger hjelp',
              `${esc.customerIdentifier || 'Ukjent'}: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`
            )
          }
        }

        previousEscalationIds.current = currentIds
        setEscalations(newEscalations)
      }
    } catch {
      // Silent fail
    }
  }

  const togglePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.warning('Ikke støttet', 'Push-varsler støttes ikke i denne nettleseren')
      return
    }

    setIsLoading(true)
    try {
      if (pushEnabled) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await subscription.unsubscribe()
            await fetch('/api/push/subscribe', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: 'current' }), // Will be replaced with actual userId
            })
          }
        }
        setPushEnabled(false)
        toast.success('Varsler av', 'Push-varsler er nå deaktivert')
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.warning('Tillatelse kreves', 'Du må gi tillatelse til varsler i nettleseren for å aktivere push-varsler')
          setIsLoading(false)
          return
        }

        // Register service worker if not already registered
        let registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js')
        }

        // Get VAPID public key
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
          console.error('VAPID public key not configured')
          setIsLoading(false)
          return
        }

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })

        // Send subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'current', // Will be replaced with actual userId
            companyId: 'current', // Will be replaced with actual companyId
            subscription: subscription.toJSON(),
          }),
        })

        setPushEnabled(true)
        toast.success('Varsler på', 'Du vil nå motta push-varsler når kunder trenger hjelp')
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error)
      toast.error('Feil', 'Kunne ikke endre varsel-innstillinger')
    } finally {
      setIsLoading(false)
    }
  }

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

  const unreadCount = escalations.length

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          pushEnabled
            ? 'text-botsy-lime bg-botsy-lime/10 hover:bg-botsy-lime/20'
            : 'text-[#A8B4C8] hover:text-white hover:bg-white/[0.05]'
        }`}
        title={pushEnabled ? 'Varsler aktivert' : 'Varsler deaktivert'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {pushEnabled && unreadCount === 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-botsy-dark-deep" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-[#1a1a2e] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
            >
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-white font-semibold">Varsler</h3>
              <button
                onClick={togglePushNotifications}
                disabled={isLoading}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pushEnabled
                    ? 'bg-botsy-lime/20 text-botsy-lime'
                    : 'bg-white/[0.05] text-[#6B7A94] hover:text-white'
                }`}
                title={pushEnabled ? 'Push-varsler på' : 'Push-varsler av'}
              >
                {isLoading ? (
                  <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                ) : pushEnabled ? (
                  <>
                    <Bell className="h-3 w-3" />
                    På
                  </>
                ) : (
                  <>
                    <Bell className="h-3 w-3" />
                    Av
                  </>
                )}
              </button>
            </div>

            {escalations.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {escalations.map((esc) => (
                  <button
                    key={esc.id}
                    onClick={() => {
                      if (onViewConversation) {
                        onViewConversation(esc.conversationId, esc.channel)
                        setIsOpen(false)
                      }
                    }}
                    className="w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {esc.customerIdentifier}
                        </p>
                        <p className="text-[#6B7A94] text-xs truncate">
                          {esc.customerMessage || 'Trenger assistanse'}
                        </p>
                        <p className="text-[#4A5568] text-xs mt-1">
                          {formatTimeAgo(esc.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-gradient-to-br from-botsy-lime/20 to-botsy-lime/5 flex items-center justify-center mb-4">
                  <CheckCircle className="h-7 w-7 text-botsy-lime" />
                </div>
                <p className="text-white font-medium">Alt er oppdatert!</p>
                <p className="text-[#6B7A94] text-sm mt-1">Ingen ventende henvendelser</p>
              </div>
            )}

            <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
              <p className="text-[#4A5568] text-xs text-center">
                {pushEnabled
                  ? 'Du mottar push-varsler når kunder trenger hjelp'
                  : 'Aktiver push-varsler for å bli varslet på mobilen'}
              </p>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

function formatTimeAgo(date: Date | string | unknown): string {
  if (!date) return 'Ukjent tid'

  const now = new Date()
  let dateObj: Date

  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === 'string') {
    dateObj = new Date(date)
  } else if (typeof date === 'object' && date !== null && 'seconds' in date) {
    // Firestore Timestamp
    dateObj = new Date((date as { seconds: number }).seconds * 1000)
  } else {
    return 'Ukjent tid'
  }

  if (isNaN(dateObj.getTime())) return 'Ukjent tid'

  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Akkurat nå'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`
  return dateObj.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}
