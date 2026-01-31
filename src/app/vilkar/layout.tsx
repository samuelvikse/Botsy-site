import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vilkår og Betingelser – Botsy',
  description: 'Les Botsy sine vilkår og betingelser for bruk av tjenesten.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Vilkår og Betingelser – Botsy',
    description: 'Les Botsy sine vilkår og betingelser for bruk av tjenesten.',
    url: 'https://botsy.no/vilkar',
  },
  alternates: {
    canonical: 'https://botsy.no/vilkar',
  },
}

export default function VilkarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
