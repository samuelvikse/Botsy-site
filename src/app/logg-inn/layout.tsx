import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Logg Inn – Botsy Dashboard',
  description: 'Logg inn på Botsy for å administrere din AI-chatbot, se samtaler, og tilpasse kundeservicen din.',
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'Logg Inn – Botsy Dashboard',
    description: 'Logg inn på Botsy for å administrere din AI-chatbot.',
    url: 'https://botsy.no/logg-inn',
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
