import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Particle Thing',
    template: '%s | Particle Thing',
  },
  description: 'Procedural particle landscapes — millions of glowing points shaped by noise, waves, and custom shaders.',
}

export const viewport: Viewport = {
  themeColor: '#010108',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#010108', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
