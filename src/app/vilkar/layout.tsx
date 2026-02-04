import { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Vilkar og Betingelser - AI Kundeservice | Botsy',
  description: 'Les Botsy sine vilkar og betingelser for bruk av AI kundeservice, chatbot og kundeservicebot. Transparent og rettferdig avtale for alle kunder.',
  keywords: [
    'Botsy vilkar',
    'AI kundeservice vilkar',
    'chatbot avtale',
    'kundeservicebot betingelser',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Vilkar og Betingelser - AI Kundeservice | Botsy',
    description: 'Les Botsy sine vilkar og betingelser for bruk av AI kundeservice og chatbot.',
    url: 'https://botsy.no/vilkar',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Vilkar og Betingelser | Botsy',
    description: 'Les Botsy sine vilkar og betingelser for AI kundeservice.',
  },
  alternates: {
    canonical: 'https://botsy.no/vilkar',
  },
}

export default function VilkarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'Vilkar og Betingelser', url: 'https://botsy.no/vilkar' },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
