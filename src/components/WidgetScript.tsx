'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Script from 'next/script'

export function WidgetScript({ companyId }: { companyId: string }) {
  const pathname = usePathname()

  // Don't load widget on admin pages, login, onboarding, invite pages, or widget preview
  const excludedPaths = ['/admin', '/login', '/onboarding', '/invite', '/transfer', '/widget']
  const shouldHide = !pathname || excludedPaths.some(path => pathname.startsWith(path))

  // Clean up widget iframe when navigating to excluded pages
  useEffect(() => {
    if (shouldHide) {
      const widgetIframe = document.getElementById('botsy-widget-iframe')
      if (widgetIframe) {
        widgetIframe.remove()
      }
    }
  }, [shouldHide, pathname])

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
