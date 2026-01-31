import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Botsy – Din digitale kollega som aldri tar ferie',
  description: 'AI-drevet kundeservice for norske bedrifter. Svar kunder 24/7 via WhatsApp, SMS, Messenger og e-post. Introduksjonstilbud: 699 kr/mnd. Prøv gratis i 14 dager.',
  keywords: ['kundeservice', 'AI', 'chatbot', 'WhatsApp', 'norsk', 'bedrift', 'automatisering'],
  authors: [{ name: 'Botsy' }],
  creator: 'Botsy',
  publisher: 'Botsy',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: 'https://botsy.no',
    siteName: 'Botsy',
    title: 'Botsy – Din digitale kollega som aldri tar ferie',
    description: 'AI-drevet kundeservice for norske bedrifter. Svar kunder 24/7 via WhatsApp, SMS, Messenger og e-post.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Botsy - AI Kundeservice',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Botsy – Din digitale kollega som aldri tar ferie',
    description: 'AI-drevet kundeservice for norske bedrifter.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb" className="scroll-smooth">
      <body className="min-h-screen bg-botsy-dark antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
