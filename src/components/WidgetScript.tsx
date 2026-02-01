'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

export function WidgetScript({ companyId }: { companyId: string }) {
  const pathname = usePathname()

  // Don't load widget on admin pages, login, onboarding, or invite pages
  const excludedPaths = ['/admin', '/login', '/onboarding', '/invite', '/transfer']
  const shouldHide = !pathname || excludedPaths.some(path => pathname.startsWith(path))

  if (shouldHide) {
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
