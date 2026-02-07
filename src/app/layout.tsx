import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import { OrganizationJsonLd, WebsiteJsonLd, SoftwareApplicationJsonLd, ProductJsonLd } from '@/components/seo/JsonLd'
import { WidgetScript } from '@/components/WidgetScript'
import { CookieConsent } from '@/components/ui/cookie-consent'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0F1C',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://botsy.no'),
  title: {
    default: 'Botsy - AI Kundeservice & Chatbot for Norske Bedrifter | Kundeservicebot 24/7',
    template: '%s | Botsy - AI Kundeservice',
  },
  description: 'Botsy er Norges ledende AI kundeservice-chatbot. Automatisk kundeservice som svarer kundene dine 24/7 via Messenger, Instagram, SMS og nettside. Kundeservicebot fra 699 kr/mnd. Prov gratis i 14 dager.',
  keywords: [
    // Hovedkeywords (prioritert)
    'AI kundeservice',
    'chatbot',
    'kundeservicebot',
    'automatisk kundeservice',
    'Botsy',
    // Norsk-spesifikke keywords
    'chatbot norge',
    'norsk chatbot',
    'AI chatbot norsk',
    'kundeservice chatbot',
    'chatbot pa norsk',
    'kundeservice norge',
    'chatbot losning norge',
    // Produkt-relatert
    'Messenger chatbot',
    'Instagram chatbot',
    'SMS chatbot',
    'nettside chatbot',
    'kundeservice automatisering',
    'automatisert kundeservice',
    // Bransje-relatert
    'chatbot for bedrifter',
    'kundeservice losning',
    'digital kundeservice',
    'virtuell assistent bedrift',
    'AI kundesupport',
    // Long-tail keywords
    'beste chatbot for sma bedrifter',
    'rimelig kundeservice losning',
    'chatbot uten koding',
    'enkel chatbot oppsett',
    '24/7 kundesupport',
    'automatisk kundesvar',
    'AI-drevet kundeservice',
    'intelligent kundeservice',
    // Konkurrent-relatert
    'alternativ til kundesenter',
    'erstatt kundeservice',
    'reduser kundeservice kostnader',
    'effektiv kundeservice',
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
    alternateLocale: ['en_US', 'sv_SE', 'da_DK'],
    url: 'https://botsy.no',
    siteName: 'Botsy - AI Kundeservice',
    title: 'Botsy - AI Kundeservice & Chatbot som Svarer Kundene Dine 24/7',
    description: 'Norges ledende AI kundeservicebot for bedrifter. Automatiser kundeservice via Messenger, Instagram, SMS og nettside. Prov Botsy gratis i 14 dager - fra 699 kr/mnd.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Botsy - AI Kundeservice og Chatbot for Norske Bedrifter',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@botsy_no',
    creator: '@botsy_no',
    title: 'Botsy - AI Kundeservice & Chatbot for Norske Bedrifter',
    description: 'Norsk AI-chatbot og kundeservicebot som svarer kundene dine 24/7. Automatisk kundeservice fra 699 kr/mnd. Prov gratis i 14 dager.',
    images: {
      url: '/og-image.png',
      alt: 'Botsy - AI Kundeservice og Chatbot for Norske Bedrifter',
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://botsy.no',
    languages: {
      'nb-NO': 'https://botsy.no',
      'x-default': 'https://botsy.no',
    },
  },
  category: 'technology',
  classification: 'Business Software',
  verification: {
    // Legg til disse nar du har verifisert
    // google: 'google-site-verification-code',
    // yandex: 'yandex-verification-code',
  },
  other: {
    'msapplication-TileColor': '#0A0F1C',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Botsy',
    'geo.region': 'NO',
    'geo.placename': 'Norway',
    'content-language': 'nb-NO',
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
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        {/* Preconnect to Firebase Auth for faster login */}
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <SoftwareApplicationJsonLd />
        <ProductJsonLd />
      </head>
      <body className="min-h-screen bg-botsy-dark antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
        <CookieConsent />
        <WidgetScript companyId="RjR6IBzbd2YX2TLFoXwuHzY2N3O2" />
      </body>
    </html>
  )
}
