'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X } from 'lucide-react'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { Button } from '@/components/ui/button'

interface SessionTimeoutWarningProps {
  /**
   * Timeout duration in minutes
   * Default: 30 minutes
   */
  timeoutMinutes?: number

  /**
   * Warning duration in minutes before timeout
   * Default: 5 minutes
   */
  warningMinutes?: number
}

export function SessionTimeoutWarning({
  timeoutMinutes = 30,
  warningMinutes = 5,
}: SessionTimeoutWarningProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const handleWarning = useCallback((seconds: number) => {
    setRemainingSeconds(seconds)
    if (!showWarning && seconds > 0) {
      setShowWarning(true)
    }
  }, [showWarning])

  const handleTimeout = useCallback(() => {
    setShowWarning(false)
  }, [])

  const { resetTimeout } = useSessionTimeout({
    timeout: timeoutMinutes * 60 * 1000,
    warningBefore: warningMinutes * 60 * 1000,
    onWarning: handleWarning,
    onTimeout: handleTimeout,
    enabled: true,
  })

  const handleStayLoggedIn = useCallback(() => {
    resetTimeout()
    setShowWarning(false)
  }, [resetTimeout])

  // Format remaining time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Update remaining seconds when warning is shown
  useEffect(() => {
    if (showWarning && remainingSeconds <= 0) {
      setShowWarning(false)
    }
  }, [showWarning, remainingSeconds])

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
        >
          <div className="bg-[#1a1a2e] border border-orange-500/30 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-orange-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-white font-medium">Sesjonen utløper snart</h3>
                    <p className="text-[#6B7A94] text-sm mt-0.5">
                      Du blir logget ut om{' '}
                      <span className="text-orange-400 font-mono font-medium">
                        {formatTime(remainingSeconds)}
                      </span>
                      {' '}på grunn av inaktivitet.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowWarning(false)}
                    className="p-1 text-[#6B7A94] hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleStayLoggedIn}
                    className="bg-botsy-lime text-botsy-dark hover:bg-botsy-lime/90"
                  >
                    Fortsett å være innlogget
                  </Button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500"
                initial={{ width: '100%' }}
                animate={{
                  width: `${(remainingSeconds / (warningMinutes * 60)) * 100}%`,
                }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SessionTimeoutWarning
