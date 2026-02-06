import { Metadata } from 'next'
import { BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Prov AI Kundeservice Gratis - Chatbot & Kundeservicebot fra 699 kr',
  description: 'Prov Botsy AI kundeservice gratis i 14 dager. 14 dager gratis proveperiode. Automatisk kundeservice med intelligent chatbot og kundeservicebot fra 699 kr/mnd. Oppsett tar kun 5 minutter.',
  keywords: [
    // Hovedkeywords
    'AI kundeservice',
    'chatbot',
    'kundeservicebot',
    'automatisk kundeservice',
    'Botsy',
    // Proveperiode-relatert
    'prov chatbot gratis',
    'gratis chatbot',
    'AI chatbot proveperiode',
    'kundeservice chatbot pris',
    'chatbot 14 dager gratis',
    'Botsy pris',
    // Kostnads-relatert
    'rimelig kundeservice losning',
    'chatbot for sma bedrifter',
    'billig AI kundeservice',
    'kundeservice 699 kr',
  ],
  openGraph: {
    title: 'Prov AI Kundeservice Gratis - Chatbot & Kundeservicebot | Botsy',
    description: 'Start gratis proveperiode med Botsy AI kundeservice. Intelligent chatbot og kundeservicebot fra 699 kr/mnd. 14 dager gratis proveperiode.',
    url: 'https://botsy.no/prov-gratis',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Botsy AI Kundeservice - Prov Gratis i 14 Dager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prov AI Kundeservice Gratis - Chatbot & Kundeservicebot | Botsy',
    description: 'Prov Botsy gratis i 14 dager. AI kundeservice med chatbot fra 699 kr/mnd.',
    images: ['/og-image.png'],
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
    { name: 'Prov AI Kundeservice Gratis', url: 'https://botsy.no/prov-gratis' },
  ]

  const faqs = [
    {
      question: 'Er AI kundeservice fra Botsy virkelig gratis a prove?',
      answer: 'Ja, du far 14 dager gratis proveperiode med full tilgang til alle funksjoner. 14 dager gratis proveperiode, og du kan kansellere nar som helst.',
    },
    {
      question: 'Hva koster Botsy AI kundeservice etter proveperioden?',
      answer: 'Botsy koster 699 kr/mnd (ordinaer pris 1499 kr/mnd). Alt er inkludert: ubegrenset meldinger, alle kanaler, team-tilgang og full support.',
    },
    {
      question: 'Hvor raskt kan jeg komme i gang med chatboten?',
      answer: 'De fleste er i gang pa under 5 minutter. Botsy analyserer nettsiden din automatisk og setter opp AI kundeservicen for deg.',
    },
    {
      question: 'Er det bindingstid pa Botsy sin kundeservicebot?',
      answer: 'Nei, det er ingen bindingstid. Du kan kansellere abonnementet nar som helst, og du betaler kun for den tiden du bruker tjenesten.',
    },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={faqs} />
      {children}
    </>
  )
}
