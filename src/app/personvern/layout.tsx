import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Personvernerklæring – Botsy',
  description: 'Les Botsy sin personvernerklæring. Vi tar personvern på alvor og er GDPR-compliant.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Personvernerklæring – Botsy',
    description: 'Les Botsy sin personvernerklæring. Vi tar personvern på alvor og er GDPR-compliant.',
    url: 'https://botsy.no/personvern',
  },
  alternates: {
    canonical: 'https://botsy.no/personvern',
  },
}

export default function PersonvernLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
