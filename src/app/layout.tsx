import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { CookieConsent } from '@/components/ui/cookie-consent'
import { OrganizationJsonLd, WebsiteJsonLd, SoftwareApplicationJsonLd } from '@/components/seo/JsonLd'
import { WidgetScript } from '@/components/WidgetScript'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0F1C',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://botsy.no'),
  title: {
    default: 'Botsy – AI Kundeservice for Norske Bedrifter | Chatbot som Svarer 24/7',
    template: '%s | Botsy',
  },
  description: 'Botsy er en norsk AI-chatbot som svarer kundene dine 24/7. Automatiser kundeservice via WhatsApp, SMS, Messenger og e-post. Prøv gratis i 14 dager. Fra 699 kr/mnd.',
  keywords: [
    // Hovedkeywords
    'AI kundeservice',
    'chatbot norge',
    'kundeservice chatbot',
    'AI chatbot norsk',
    'automatisert kundeservice',
    // Produkt-relatert
    'WhatsApp chatbot',
    'SMS chatbot',
    'Messenger chatbot',
    'e-post automatisering',
    'kundeservice automatisering',
    // Bransje-relatert
    'chatbot for bedrifter',
    'kundeservice løsning',
    'digital kundeservice',
    'virtuell assistent bedrift',
    // Norsk-spesifikk
    'norsk chatbot',
    'chatbot på norsk',
    'AI på norsk',
    'kundeservice norge',
    'chatbot løsning norge',
    // Long-tail
    'beste chatbot for små bedrifter',
    'rimelig kundeservice løsning',
    'chatbot uten koding',
    'enkel chatbot oppsett',
    '24/7 kundesupport',
    'automatisk kundesvar',
    // Konkurrent-relatert
    'alternativ til kundeservice',
    'erstatt kundesenter',
    'reduser kundeservice kostnader',
  ],
  authors: [{ name: 'Botsy', url: 'https://botsy.no' }],
  creator: 'Botsy',
  publisher: 'Botsy',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    shortcut: '/favicon.svg',
    apple: [
      { url: '/phone_app_icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    alternateLocale: 'en_US',
    url: 'https://botsy.no',
    siteName: 'Botsy',
    title: 'Botsy – AI Kundeservice som Svarer Kundene Dine 24/7',
    description: 'Norsk AI-chatbot for bedrifter. Automatiser kundeservice via WhatsApp, SMS, Messenger og e-post. Prøv gratis i 14 dager.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Botsy - AI Kundeservice for Norske Bedrifter',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Botsy – AI Kundeservice for Norske Bedrifter',
    description: 'Norsk AI-chatbot som svarer kundene dine 24/7. Prøv gratis i 14 dager.',
    images: ['/og-image.png'],
    creator: '@botsy_no',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://botsy.no',
    languages: {
      'nb-NO': 'https://botsy.no',
      'en-US': 'https://botsy.no/en',
    },
  },
  category: 'technology',
  classification: 'Business Software',
  verification: {
    // Legg til disse når du har verifisert
    // google: 'google-site-verification-code',
    // yandex: 'yandex-verification-code',
  },
  other: {
    'msapplication-TileColor': '#0A0F1C',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Botsy',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className="scroll-smooth">
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <SoftwareApplicationJsonLd />
      </head>
      <body className="min-h-screen bg-botsy-dark antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
            <CookieConsent />
          </ToastProvider>
        </AuthProvider>
        <WidgetScript companyId="RjR6IBzbd2YX2TLFoXwuHzY2N3O2" />
      </body>
    </html>
  )
}
