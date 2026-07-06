import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zelaya & Co. Finance',
    short_name: 'Zelaya & Co.',
    description: 'Invoicing and bookkeeping for Zelaya & Co. LLC',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#2563eb',
    icons: [
      { src: '/manifest-icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/manifest-icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/manifest-icons/512-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
