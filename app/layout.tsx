import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Code Raid - Collaborative Code Testing',
  description: 'Real-time collaborative code testing platform with live sync and presence tracking',
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
