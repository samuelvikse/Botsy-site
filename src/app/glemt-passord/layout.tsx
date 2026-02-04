import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glemt Passord - Tilbakestill Konto | Botsy AI Kundeservice',
  description: 'Tilbakestill passordet ditt for Botsy AI kundeservice-kontoen. Fa tilgang til din chatbot og kundeservicebot igjen.',
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'Glemt Passord | Botsy',
    description: 'Tilbakestill passordet ditt for Botsy AI kundeservice-kontoen.',
    url: 'https://botsy.no/glemt-passord',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Glemt Passord | Botsy',
    description: 'Tilbakestill passordet ditt for Botsy-kontoen.',
  },
  alternates: {
    canonical: 'https://botsy.no/glemt-passord',
  },
}

export default function GlemtPassordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
