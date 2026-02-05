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
    <>
      <style>{`
        html, body, .bg-botsy-dark {
          background: transparent !important;
          background-color: transparent !important;
          min-height: auto !important;
        }
      `}</style>
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
    </>
  )
}
