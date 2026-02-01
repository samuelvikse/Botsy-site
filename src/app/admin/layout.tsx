import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Admin | Botsy',
    template: '%s | Botsy Admin',
  },
  icons: {
    icon: '/brand/botsy-icon-dark.svg',
    shortcut: '/brand/botsy-icon-dark.svg',
    apple: '/brand/botsy-icon-dark.svg',
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
