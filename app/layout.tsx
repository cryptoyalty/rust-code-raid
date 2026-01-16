import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Raid.Codes - Collaborative Code Lock Raiding Tool',
  description: 'Real-time collaborative tool for raiding Rust code locks with your team. Weighted code selection, live sync, and instant progress tracking across unlimited raiders.',
  openGraph: {
    title: 'Raid.Codes',
    description: 'Collaborative Rust code lock raiding tool with real-time sync and weighted code selection',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Raid.Codes',
    description: 'Raid 10,000 Rust code locks with your team in real-time',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="fixed inset-0 grid-bg pointer-events-none" />
        {children}
      </body>
    </html>
  )
}
