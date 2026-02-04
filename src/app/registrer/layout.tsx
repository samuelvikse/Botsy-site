import { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Opprett Konto - Start med AI Kundeservice & Chatbot | Botsy',
  description: 'Opprett din Botsy-konto og start 14 dagers gratis proveperiode med AI kundeservice. Ingen kredittkort nodvendig. Fa din egen chatbot og kundeservicebot pa under 5 minutter.',
  keywords: [
    // Hovedkeywords
    'AI kundeservice',
    'chatbot',
    'kundeservicebot',
    'automatisk kundeservice',
    'Botsy registrer',
    // Registrering-relatert
    'opprett chatbot konto',
    'start med AI kundeservice',
    'gratis chatbot registrering',
    'registrer Botsy',
    'kom i gang med chatbot',
  ],
  openGraph: {
    title: 'Opprett Konto - Start med AI Kundeservice & Chatbot | Botsy',
    description: 'Start 14 dagers gratis proveperiode med Botsy AI kundeservice. Ingen kredittkort nodvendig.',
    url: 'https://botsy.no/registrer',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Opprett Botsy-konto - AI Kundeservice og Chatbot',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opprett Konto - Start med AI Kundeservice | Botsy',
    description: 'Start gratis med Botsy AI kundeservice og chatbot. Ingen kredittkort nodvendig.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://botsy.no/registrer',
  },
}

export default function RegistrerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'Opprett AI Kundeservice Konto', url: 'https://botsy.no/registrer' },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
