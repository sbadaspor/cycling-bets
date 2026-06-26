import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navbar } from '@/components/ui/Navbar'

export const metadata: Metadata = {
  title: 'VeloApostas | Ciclismo entre Amigos',
  description: 'Sistema de apostas de ciclismo — Previsões Top-20 e classificações especiais',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F6F4EF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VeloApostas" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
        <Navbar />
        <main style={{ maxWidth: 1216, margin: '0 auto', padding: '20px 16px 40px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
