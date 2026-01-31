import { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Prøv Gratis i 14 Dager – Start med Botsy AI Kundeservice',
  description: 'Start din gratis 14-dagers prøveperiode med Botsy. Ingen kredittkort nødvendig. Automatiser kundeservice med AI-chatbot fra 699 kr/mnd. Oppsett tar under 10 minutter.',
  keywords: [
    'prøv chatbot gratis',
    'gratis chatbot',
    'AI chatbot prøveperiode',
    'kundeservice chatbot pris',
    'chatbot 14 dager gratis',
    'Botsy pris',
    'rimelig kundeservice løsning',
    'chatbot for små bedrifter',
  ],
  openGraph: {
    title: 'Prøv Botsy Gratis i 14 Dager – Ingen Kredittkort',
    description: 'Start din gratis prøveperiode med Botsy AI kundeservice. Automatiser kundeservice fra 699 kr/mnd.',
    url: 'https://botsy.no/prov-gratis',
    images: [
      {
        url: '/og-image-pricing.png',
        width: 1200,
        height: 630,
        alt: 'Botsy Priser og Gratis Prøveperiode',
      },
    ],
  },
  alternates: {
    canonical: 'https://botsy.no/prov-gratis',
  },
}

export default function ProvGratisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'Prøv Gratis', url: 'https://botsy.no/prov-gratis' },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
