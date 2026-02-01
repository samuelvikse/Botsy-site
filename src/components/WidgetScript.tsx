'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

export function WidgetScript({ companyId }: { companyId: string }) {
  const pathname = usePathname()

  // Don't load widget on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <Script
      src="/widget.js"
      data-company-id={companyId}
      strategy="lazyOnload"
    />
  )
}
