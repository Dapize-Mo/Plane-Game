import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PARTICLE FLIGHT',
  description: 'Fly through a world made of particles',
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
