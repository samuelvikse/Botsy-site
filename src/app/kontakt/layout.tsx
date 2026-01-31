import { Metadata } from 'next'
import { BreadcrumbJsonLd, LocalBusinessJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Kontakt Oss – Snakk med Botsy-teamet',
  description: 'Har du spørsmål om Botsy? Kontakt oss for en uforpliktende prat om hvordan AI-chatbot kan hjelpe bedriften din. Vi svarer innen 24 timer.',
  keywords: [
    'kontakt Botsy',
    'chatbot demo',
    'AI kundeservice demo',
    'Botsy support',
    'chatbot konsultasjon',
    'kundeservice løsning norge',
  ],
  openGraph: {
    title: 'Kontakt Oss – Snakk med Botsy-teamet',
    description: 'Har du spørsmål om Botsy? Kontakt oss for en uforpliktende prat.',
    url: 'https://botsy.no/kontakt',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kontakt Botsy',
      },
    ],
  },
  alternates: {
    canonical: 'https://botsy.no/kontakt',
  },
}

export default function KontaktLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'Kontakt', url: 'https://botsy.no/kontakt' },
  ]

  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
