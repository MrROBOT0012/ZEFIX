import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Zelaya & Co. Finance',
  description: 'Invoicing and bookkeeping for Zelaya & Co. LLC',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zelaya & Co.',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 text-gray-900">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
