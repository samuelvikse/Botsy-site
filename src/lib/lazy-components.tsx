'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Loading component for lazy-loaded components
function ComponentLoader(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-botsy-lime" />
    </div>
  )
}

// Lazy load modals - they're not needed on initial page load
export const LazyModal = dynamic(
  () => import('@/components/ui/modal').then(mod => ({ default: mod.Modal })),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

export const LazyConfirmDialog = dynamic(
  () => import('@/components/ui/modal').then(mod => ({ default: mod.ConfirmDialog })),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

export const LazyInputDialog = dynamic(
  () => import('@/components/ui/modal').then(mod => ({ default: mod.InputDialog })),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

// Lazy load dashboard views - load on demand when tab is selected
export const LazyAnalyticsView = dynamic(
  () => import('@/components/dashboard/AnalyticsView').then(mod => ({ default: mod.AnalyticsView })),
  { loading: () => <ComponentLoader /> }
)

export const LazyConversationsView = dynamic(
  () => import('@/components/dashboard/ConversationsView').then(mod => ({ default: mod.ConversationsView })),
  { loading: () => <ComponentLoader /> }
)

export const LazyKnowledgeDocsView = dynamic(
  () => import('@/components/dashboard/KnowledgeDocsView').then(mod => ({ default: mod.KnowledgeDocsView })),
  { loading: () => <ComponentLoader /> }
)

export const LazyInstructionsView = dynamic(
  () => import('@/components/dashboard/InstructionsView').then(mod => ({ default: mod.InstructionsView })),
  { loading: () => <ComponentLoader /> }
)

export const LazyWidgetSettingsView = dynamic(
  () => import('@/components/dashboard/WidgetSettingsView').then(mod => ({ default: mod.WidgetSettingsView })),
  { loading: () => <ComponentLoader /> }
)

export const LazyChannelsView = dynamic(
  () => import('@/components/dashboard/ChannelsView').then(mod => ({ default: mod.ChannelsView })),
  { loading: () => <ComponentLoader /> }
)

export const LazyToneConfigView = dynamic(
  () => import('@/components/dashboard/ToneConfigView').then(mod => ({ default: mod.ToneConfigView })),
  { loading: () => <ComponentLoader /> }
)

export const LazySecuritySettingsView = dynamic(
  () => import('@/components/dashboard/SecuritySettingsView'),
  { loading: () => <ComponentLoader /> }
)

export const LazyEmployeesView = dynamic(
  () => import('@/components/dashboard/EmployeesView').then(mod => ({ default: mod.EmployeesView })),
  { loading: () => <ComponentLoader /> }
)

// Lazy load Stripe components - only needed on billing page
export const LazyStripeCheckout = dynamic(
  () => import('@/components/stripe/StripeCheckout'),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

export const LazyPaymentForm = dynamic(
  () => import('@/components/stripe/PaymentForm'),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

// Lazy load heavy onboarding components
export const LazyWebsiteAnalysisStep = dynamic(
  () => import('@/components/onboarding/WebsiteAnalysisStep').then(mod => ({ default: mod.WebsiteAnalysisStep })),
  { loading: () => <ComponentLoader /> }
)

// Lazy load chat panel - often below fold or in sidebar
export const LazyBotsyChatPanel = dynamic(
  () => import('@/components/dashboard/BotsyChatPanel').then(mod => ({ default: mod.BotsyChatPanel })),
  { loading: () => <ComponentLoader /> }
)
