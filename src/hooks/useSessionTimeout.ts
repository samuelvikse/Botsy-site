'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UseSessionTimeoutOptions {
  /**
   * Timeout duration in milliseconds
   * Default: 30 minutes (1800000ms)
   */
  timeout?: number

  /**
   * Warning duration before timeout in milliseconds
   * Default: 5 minutes (300000ms)
   */
  warningBefore?: number

  /**
   * Callback when session is about to expire
   */
  onWarning?: (remainingSeconds: number) => void

  /**
   * Callback when session expires
   */
  onTimeout?: () => void

  /**
   * Whether the timeout is enabled
   * Default: true
   */
  enabled?: boolean
}

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
]

const DEFAULT_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const DEFAULT_WARNING = 5 * 60 * 1000 // 5 minutes before timeout

/**
 * Hook to handle automatic session timeout after inactivity
 *
 * Usage:
 * ```tsx
 * const { remainingTime, isWarning, resetTimeout } = useSessionTimeout({
 *   timeout: 30 * 60 * 1000, // 30 minutes
 *   warningBefore: 5 * 60 * 1000, // Warn 5 minutes before
 *   onWarning: (seconds) => console.log(`Session expires in ${seconds}s`),
 *   onTimeout: () => console.log('Session expired'),
 * })
 * ```
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    warningBefore = DEFAULT_WARNING,
    onWarning,
    onTimeout,
    enabled = true,
  } = options

  const { user, signOut } = useAuth()

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const warningIdRef = useRef<NodeJS.Timeout | null>(null)
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current)
      warningIdRef.current = null
    }
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current)
      warningIntervalRef.current = null
    }
  }, [])

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    clearTimers()

    console.log('[Session] Session timed out due to inactivity')

    if (onTimeout) {
      onTimeout()
    }

    // Sign out the user
    try {
      await signOut()
    } catch (error) {
      console.error('[Session] Error signing out:', error)
    }

    // Redirect to login
    window.location.href = '/logg-inn?reason=timeout'
  }, [clearTimers, onTimeout, signOut])

  // Start warning countdown
  const startWarning = useCallback(() => {
    if (!onWarning) return

    const warningEnd = lastActivityRef.current + timeout

    warningIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((warningEnd - Date.now()) / 1000))
      onWarning(remaining)

      if (remaining <= 0) {
        if (warningIntervalRef.current) {
          clearInterval(warningIntervalRef.current)
        }
      }
    }, 1000)
  }, [onWarning, timeout])

  // Reset the timeout timer
  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()
    clearTimers()

    if (!enabled || !user) return

    // Set warning timer
    if (onWarning && warningBefore > 0) {
      warningIdRef.current = setTimeout(() => {
        startWarning()
      }, timeout - warningBefore)
    }

    // Set timeout timer
    timeoutIdRef.current = setTimeout(() => {
      handleTimeout()
    }, timeout)
  }, [enabled, user, timeout, warningBefore, onWarning, clearTimers, startWarning, handleTimeout])

  // Handle user activity
  const handleActivity = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || !user) {
      clearTimers()
      return
    }

    // Initial setup
    resetTimeout()

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Handle visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if session should have expired while away
        const elapsed = Date.now() - lastActivityRef.current
        if (elapsed >= timeout) {
          handleTimeout()
        } else {
          // Don't reset on visibility change, just check
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle storage event (sync across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'botsy_session_activity') {
        lastActivityRef.current = parseInt(e.newValue || '0', 10)
        resetTimeout()
      }
    }

    window.addEventListener('storage', handleStorage)

    // Sync activity across tabs
    const syncActivity = () => {
      localStorage.setItem('botsy_session_activity', lastActivityRef.current.toString())
    }

    const syncInterval = setInterval(syncActivity, 60000) // Sync every minute

    return () => {
      clearTimers()
      clearInterval(syncInterval)

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [enabled, user, timeout, resetTimeout, handleActivity, handleTimeout, clearTimers])

  // Calculate remaining time
  const getRemainingTime = useCallback(() => {
    if (!user || !enabled) return null
    const elapsed = Date.now() - lastActivityRef.current
    return Math.max(0, timeout - elapsed)
  }, [user, enabled, timeout])

  return {
    /**
     * Reset the timeout timer (call on user activity)
     */
    resetTimeout,

    /**
     * Get remaining time in milliseconds
     */
    getRemainingTime,

    /**
     * Whether the warning period has started
     */
    isWarning: getRemainingTime() !== null && getRemainingTime()! <= warningBefore,
  }
}

export default useSessionTimeout
