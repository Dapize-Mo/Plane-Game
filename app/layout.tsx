import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Particle Thing',
    template: '%s | Particle Thing',
  },
  description: 'A procedural particle landscape — 1,000,000 glowing points shaped by noise.',
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
      <body>{children}</body>
    </html>
  )
}
