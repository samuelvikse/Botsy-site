import { Metadata } from 'next'
import { FAQJsonLd, BreadcrumbJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'AI Kundeservice Funksjoner - Chatbot & Kundeservicebot fra Botsy',
  description: 'Utforsk Botsy sine AI kundeservice-funksjoner: Intelligent chatbot, kundeservicebot 24/7, Messenger-integrasjon, Instagram DM, SMS, automatisk kundeservice og mer. Se hvordan Botsy automatiserer din kundeservice.',
  keywords: [
    // Hovedkeywords
    'AI kundeservice',
    'chatbot',
    'kundeservicebot',
    'automatisk kundeservice',
    'Botsy funksjoner',
    // Funksjons-relatert
    'chatbot funksjoner',
    'AI kundeservice funksjoner',
    'Messenger chatbot',
    'Instagram chatbot',
    'SMS chatbot',
    'flerspraklig chatbot',
    'kundeservice automatisering',
    'chatbot analyser',
    'chatbot integrasjoner',
    'norsk AI chatbot',
    '24/7 kundeservice',
    'intelligent kundeservice',
  ],
  openGraph: {
    title: 'AI Kundeservice Funksjoner - Chatbot & Kundeservicebot | Botsy',
    description: 'Utforsk alle Botsy sine AI kundeservice-funksjoner: Intelligent chatbot, kundeservicebot 24/7, Messenger, Instagram, SMS og mer. Automatiser kundeservice enkelt.',
    url: 'https://botsy.no/funksjoner',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Botsy AI Kundeservice Funksjoner - Chatbot og Kundeservicebot',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Kundeservice Funksjoner - Chatbot & Kundeservicebot | Botsy',
    description: 'Utforsk Botsy sine AI kundeservice-funksjoner: Chatbot, kundeservicebot, Messenger, Instagram og mer.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://botsy.no/funksjoner',
  },
}

export default function FunksjonerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const faqs = [
    {
      question: 'Hva er AI kundeservice fra Botsy?',
      answer: 'Botsy er en intelligent AI kundeservice-losning med chatbot og kundeservicebot som automatisk svarer kundene dine 24/7. Den laerer om bedriften din og svarer pa norsk, engelsk og flere sprak.',
    },
    {
      question: 'Hvilke kanaler stotter Botsy sin chatbot?',
      answer: 'Botsy sin AI chatbot stotter Facebook Messenger, Instagram DM, SMS, nettside-widget og e-post. Du kan koble til alle kanalene fra ett dashboard for enkel kundeservice-administrasjon.',
    },
    {
      question: 'Kan Botsy sin kundeservicebot svare pa flere sprak?',
      answer: 'Ja, Botsy sin AI kundeservicebot stotter norsk, engelsk, svensk, dansk og flere andre sprak. Den gjenkjenner automatisk hvilket sprak kunden skriver pa og tilpasser seg.',
    },
    {
      question: 'Hvordan laerer Botsy om bedriften min for automatisk kundeservice?',
      answer: 'Du skriver inn nettadressen din, og Botsy scanner nettsiden automatisk. Jo mer informasjon du gir, jo bedre svar kan AI-chatboten gi. Den oppdaterer seg automatisk hver time.',
    },
    {
      question: 'Kan jeg tilpasse chatboten og kundeserviceboten?',
      answer: 'Ja, du kan justere Botsy sin tone fra formell til uformell, velge om den skal bruke emojier, og gi spesifikke instruksjoner for hvordan AI kundeservicen skal oppfore seg.',
    },
    {
      question: 'Hva koster Botsy AI kundeservice?',
      answer: 'Botsy koster fra 699 kr/mnd med alle funksjoner inkludert. Du far 14 dager gratis proveperiode. Det er ingen skjulte kostnader eller bindingstid.',
    },
  ]

  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'AI Kundeservice Funksjoner', url: 'https://botsy.no/funksjoner' },
  ]

  return (
    <>
      <ServiceJsonLd />
      <FAQJsonLd faqs={faqs} />
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
