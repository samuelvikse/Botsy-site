import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Logg Inn - AI Kundeservice Dashboard | Botsy',
  description: 'Logg inn pa Botsy for a administrere din AI kundeservice, chatbot og kundeservicebot. Se samtaler, analyser og tilpass din automatiske kundeservice.',
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'Logg Inn - AI Kundeservice Dashboard | Botsy',
    description: 'Logg inn pa Botsy for a administrere din AI kundeservice og chatbot.',
    url: 'https://botsy.no/logg-inn',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Logg Inn | Botsy',
    description: 'Logg inn pa Botsy AI kundeservice dashboard.',
  },
  alternates: {
    canonical: 'https://botsy.no/logg-inn',
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
