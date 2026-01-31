import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glemt Passord – Botsy',
  description: 'Tilbakestill passordet ditt for Botsy-kontoen.',
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'Glemt Passord – Botsy',
    description: 'Tilbakestill passordet ditt for Botsy-kontoen.',
    url: 'https://botsy.no/glemt-passord',
  },
}

export default function GlemtPassordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
