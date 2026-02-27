import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Monochrome Terrain',
    template: '%s | Monochrome Terrain',
  },
  description: 'A procedural particle world with 1,000,000 points — hills, mountains, and a deep trench.',
}

export const viewport: Viewport = {
  themeColor: '#010102',
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
