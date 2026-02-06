import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ofte Stilte Sp\u00f8rsm\u00e5l (FAQ) - Botsy AI Kundeservice',
  description: 'Finn svar p\u00e5 vanlige sp\u00f8rsm\u00e5l om Botsy AI kundeservice-chatbot. Les om priser, oppsett, funksjoner, sikkerhet og mer. Gratis pr\u00f8veperiode p\u00e5 14 dager.',
  keywords: [
    'Botsy FAQ',
    'ofte stilte sp\u00f8rsm\u00e5l',
    'chatbot sp\u00f8rsm\u00e5l',
    'AI kundeservice hjelp',
    'Botsy priser',
    'chatbot oppsett',
    'kundeservice sp\u00f8rsm\u00e5l',
    'Botsy support',
    'hvordan bruke chatbot',
    'chatbot integrasjon',
  ],
  openGraph: {
    title: 'Ofte Stilte Sp\u00f8rsm\u00e5l (FAQ) - Botsy AI Kundeservice',
    description: 'Finn svar p\u00e5 vanlige sp\u00f8rsm\u00e5l om Botsy AI kundeservice-chatbot. Les om priser, oppsett, funksjoner, sikkerhet og mer.',
    url: 'https://botsy.no/sporsmal',
    type: 'website',
    locale: 'nb_NO',
    siteName: 'Botsy - AI Kundeservice',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Botsy FAQ - Ofte Stilte Sp\u00f8rsm\u00e5l',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ofte Stilte Sp\u00f8rsm\u00e5l (FAQ) - Botsy',
    description: 'Finn svar p\u00e5 vanlige sp\u00f8rsm\u00e5l om Botsy AI kundeservice-chatbot.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://botsy.no/sporsmal',
  },
}

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
