import { Metadata } from 'next'
import { FAQJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Funksjoner – Alt Botsy Kan Gjøre for Din Bedrift',
  description: 'Utforsk alle Botsy sine funksjoner: AI-chatbot, WhatsApp-integrasjon, flerspråklig støtte, kunnskapsbase, tone-tilpasning, analyser og mer. Se hvordan Botsy automatiserer kundeservice.',
  keywords: [
    'chatbot funksjoner',
    'AI kundeservice funksjoner',
    'WhatsApp business chatbot',
    'flerspråklig chatbot',
    'kundeservice automatisering',
    'chatbot analyser',
    'chatbot integrasjoner',
    'norsk AI chatbot',
  ],
  openGraph: {
    title: 'Funksjoner – Alt Botsy Kan Gjøre for Din Bedrift',
    description: 'Utforsk alle Botsy sine funksjoner: AI-chatbot, WhatsApp-integrasjon, kunnskapsbase, analyser og mer.',
    url: 'https://botsy.no/funksjoner',
    images: [
      {
        url: '/og-image-features.png',
        width: 1200,
        height: 630,
        alt: 'Botsy Funksjoner',
      },
    ],
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
      question: 'Hvilke kanaler støtter Botsy?',
      answer: 'Botsy støtter WhatsApp, SMS, Facebook Messenger, Instagram DM og e-post. Du kan koble til alle kanalene fra ett dashboard.',
    },
    {
      question: 'Kan Botsy svare på flere språk?',
      answer: 'Ja, Botsy støtter norsk, engelsk, svensk, dansk og flere andre språk. Den gjenkjenner automatisk hvilket språk kunden skriver på.',
    },
    {
      question: 'Hvordan lærer Botsy om bedriften min?',
      answer: 'Du laster opp dokumenter, legger til FAQ-er, eller lar Botsy scanne nettsiden din. Jo mer informasjon du gir, jo bedre svar kan Botsy gi.',
    },
    {
      question: 'Kan jeg tilpasse hvordan Botsy svarer?',
      answer: 'Ja, du kan justere Botsy sin tone fra formell til uformell, velge om den skal bruke emojier, og gi spesifikke instruksjoner for hvordan den skal oppføre seg.',
    },
  ]

  const breadcrumbs = [
    { name: 'Hjem', url: 'https://botsy.no' },
    { name: 'Funksjoner', url: 'https://botsy.no/funksjoner' },
  ]

  return (
    <>
      <FAQJsonLd faqs={faqs} />
      <BreadcrumbJsonLd items={breadcrumbs} />
      {children}
    </>
  )
}
