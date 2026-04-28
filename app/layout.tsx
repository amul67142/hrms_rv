import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/providers'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Realvibe HRM',
  description: 'Human Resource Management System',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="dark">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
