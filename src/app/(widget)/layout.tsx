import '@/app/globals.css'

export const metadata = {
  title: 'Botsy Chat Widget',
  robots: {
    index: false,
    follow: false,
  },
}

export default function WidgetRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nb">
      <body style={{ background: 'transparent', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
