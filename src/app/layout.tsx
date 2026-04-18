import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/ui/Navbar'

export const metadata: Metadata = {
  title: 'VeloApostas | Ciclismo entre Amigos',
  description: 'Sistema de apostas de ciclismo — Previsões Top-20 e classificações especiais',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="dark">
      <body className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <Navbar />
        <main className="max-w-2xl lg:max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 py-5 lg:py-8">
          {children}
        </main>
        {/* Bottom nav spacer — only on mobile */}
        <div className="bottom-nav-spacer lg:hidden" />
      </body>
    </html>
  )
}
