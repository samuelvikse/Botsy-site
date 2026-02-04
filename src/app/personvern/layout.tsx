import { Metadata } from 'next'
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Personvernerklaering - GDPR & Datasikkerhet | Botsy AI Kundeservice',
  description: 'Les Botsy sin personvernerklaering for AI kundeservice og chatbot. Vi tar personvern pa alvor og er GDPR-compliant. Dine data er trygge hos oss.',
  keywords: [
    'Botsy personvern',
    'AI kundeservice GDPR',
    'chatbot personvern',
    'kundeservicebot datasikkerhet',
    'GDPR chatbot',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Personvernerklaering - GDPR & Datasikkerhet | Botsy',
    description: 'Les Botsy sin personvernerklaering. GDPR-compliant AI kundeservice og chatbot.',
    url: 'https://botsy.no/personvern',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Personvernerklaering | Botsy',
    description: 'Botsy tar personvern pa alvor. GDPR-compliant AI kundeservice.',
  },
  alternates: {
    canonical: 'https://botsy.no/personvern',
  },
}

export default function PersonvernLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'Personvernerklaering', url: 'https://botsy.no/personvern' },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
