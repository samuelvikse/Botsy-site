import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Admin | Botsy',
    template: '%s | Botsy Admin',
  },
  icons: {
    icon: '/brand/botsy-icon-dark.svg',
    shortcut: '/brand/botsy-icon-dark.svg',
    apple: [
      { url: '/phone_app_icon_admin.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Botsy Admin',
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
