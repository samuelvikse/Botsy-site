import { Metadata } from 'next'
import { BreadcrumbJsonLd, LocalBusinessJsonLd, FAQJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Kontakt Botsy - Fa Demo av AI Kundeservice & Chatbot',
  description: 'Kontakt Botsy for sporsmol om AI kundeservice, chatbot og kundeservicebot. Book en gratis demo eller fa hjelp med automatisk kundeservice. Vi svarer innen 2-4 timer.',
  keywords: [
    // Hovedkeywords
    'kontakt Botsy',
    'AI kundeservice demo',
    'chatbot demo',
    'kundeservicebot demo',
    'automatisk kundeservice demo',
    // Relaterte keywords
    'Botsy support',
    'chatbot konsultasjon',
    'kundeservice losning norge',
    'AI kundeservice norge',
    'chatbot for bedrifter',
    'book demo chatbot',
  ],
  openGraph: {
    title: 'Kontakt Botsy - Fa Demo av AI Kundeservice & Chatbot',
    description: 'Har du sporsmol om AI kundeservice eller chatbot? Kontakt Botsy for en uforpliktende demo av var kundeservicebot.',
    url: 'https://botsy.no/kontakt',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kontakt Botsy - AI Kundeservice og Chatbot',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kontakt Botsy - Fa Demo av AI Kundeservice & Chatbot',
    description: 'Kontakt oss for sporsmol om AI kundeservice, chatbot og automatisk kundeservice.',
    images: ['/og-image.png'],
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
    { name: 'Kontakt Botsy', url: 'https://botsy.no/kontakt' },
  ]

  const faqs = [
    {
      question: 'Hvor lang tid tar det a sette opp Botsy AI kundeservice?',
      answer: 'De fleste er i gang pa under 5 minutter. Botsy analyserer nettsiden din automatisk og setter opp chatboten for deg.',
    },
    {
      question: 'Trenger jeg teknisk kompetanse for a bruke AI kundeservicen?',
      answer: 'Nei! Du trenger bare a lime inn en kodelinje pa nettsiden din. Ingen teknisk kunnskap er nodvendig for a komme i gang med Botsy.',
    },
    {
      question: 'Kan jeg prove AI chatboten for jeg kjoper?',
      answer: 'Ja, Botsy tilbyr 14 dager gratis proveperiode med full tilgang til alle funksjoner. Ingen kredittkort nodvendig.',
    },
    {
      question: 'Hvordan fungerer integrasjonene med Messenger og Instagram?',
      answer: 'Vi guider deg gjennom hele prosessen for Messenger, Instagram, SMS og e-post. Det tar bare noen minutter a koble til kanalene.',
    },
  ]

  return (
    <>
      <LocalBusinessJsonLd />
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={faqs} />
      {children}
    </>
  )
}
