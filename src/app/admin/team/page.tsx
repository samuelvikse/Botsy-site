'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeamPage() {
  const router = useRouter()

  useEffect(() => {
    // Admin panel moved to admin.botsy.no
    router.replace('https://admin.botsy.no')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#CDFF4D] animate-spin" />
    </div>
  )
}
