import '@/app/globals.css'

export const metadata = {
  title: 'Botsy Chat Widget',
}

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  )
}
