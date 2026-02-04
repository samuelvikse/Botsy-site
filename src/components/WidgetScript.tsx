'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Script from 'next/script'

export function WidgetScript({ companyId }: { companyId: string }) {
  const pathname = usePathname()

  // Don't show widget on admin pages, login, onboarding, invite pages, or widget preview
  const excludedPaths = ['/admin', '/logg-inn', '/onboarding', '/invite', '/transfer', '/widget']
  const shouldHide = !pathname || excludedPaths.some(path => pathname.startsWith(path))

  // Hide/show widget iframe based on current path (don't remove, just hide)
  useEffect(() => {
    const widgetIframe = document.getElementById('botsy-widget-iframe')
    if (widgetIframe) {
      if (shouldHide) {
        widgetIframe.style.display = 'none'
      } else {
        widgetIframe.style.display = ''
      }
    }
  }, [shouldHide, pathname])

  // Always render the Script tag so it loads once
  return (
    <Script
      src="/widget.js"
      data-company-id={companyId}
      strategy="lazyOnload"
    />
  )
}
