import { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Opprett Konto – Start Gratis med Botsy',
  description: 'Opprett din Botsy-konto og start 14 dagers gratis prøveperiode. Ingen kredittkort nødvendig. Automatiser kundeservice med AI på under 5 minutter.',
  keywords: [
    'registrer Botsy',
    'opprett chatbot konto',
    'start med AI kundeservice',
    'gratis chatbot registrering',
  ],
  openGraph: {
    title: 'Opprett Konto – Start Gratis med Botsy',
    description: 'Start 14 dagers gratis prøveperiode. Ingen kredittkort nødvendig.',
    url: 'https://botsy.no/registrer',
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
    { name: 'Registrer', url: 'https://botsy.no/registrer' },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
