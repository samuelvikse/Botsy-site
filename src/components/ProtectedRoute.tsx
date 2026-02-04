'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  useEffect(() => {
    if (!loading) {
      setInitialCheckDone(true)
      if (!user) {
        router.push('/logg-inn')
      } else {
        setShowContent(true)
      }
    }
  }, [user, loading, router])

  // Show a minimal loading state only on initial load (very fast)
  // This prevents flash of content before auth state is determined
  if (!initialCheckDone) {
    return (
      <div className="min-h-screen bg-botsy-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-botsy-lime/20 border-t-botsy-lime rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // If no user after check, don't render anything (redirect happening)
  if (!user) {
    return null
  }

  // Render content immediately once we know user is authenticated
  return <>{children}</>
}
