'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Perfil } from '@/types'

const NotificationButton = dynamic(
  () => import('@/components/ui/NotificationButton'),
  { ssr: false }
)

/* ─────────────────────────────────────────────
   Icons (inline SVG — zero dependencies)
───────────────────────────────────────────── */
const IconHome = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/>
  </svg>
)
const IconBet = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h3"/>
  </svg>
)
const IconAdmin = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    <path d="M18 14l2 2 4-4" strokeWidth="2"/>
  </svg>
)
const IconUser = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const IconBike = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
    <path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5L8.5 9H5M15 6l-3 5.5m0 0H8.5m3.5 0l3.5 5.5"/>
  </svg>
)

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase.from('perfis').select('*').eq('id', user.id).single()
          .then(({ data }) => setPerfil(data))
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setPerfil(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initial = perfil?.username?.[0]?.toUpperCase() ?? '?'

  /* ── BOTTOM NAV (mobile) ── */
  const bottomLinks = [
    { href: '/', label: 'Início', icon: <IconHome /> },
    ...(user ? [{ href: '/apostas', label: 'Apostas', icon: <IconBet /> }] : []),
    ...(perfil?.is_admin ? [{ href: '/admin', label: 'Admin', icon: <IconAdmin /> }] : []),
  ]

  return (
    <>
      {/* ── TOP BAR ─────────────────────────────── */}
      <header style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div className="max-w-2xl lg:max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span style={{ color: 'var(--lime)' }} className="transition-transform group-hover:scale-110">
              <IconBike />
            </span>
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: '1.35rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--text)',
            }}>
              Velo<span style={{ color: 'var(--lime)' }}>Apostas</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {bottomLinks.map(link => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.875rem', borderRadius: '0.75rem',
                    fontSize: '0.875rem', fontWeight: 500,
                    color: active ? 'var(--lime)' : 'var(--text-dim)',
                    background: active ? 'rgba(200,244,0,0.1)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                  className="hover:text-white"
                >
                  {link.icon}
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Auth section */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2.5">
                {/* Avatar — clicável para perfil */}
                <Link href="/conta" className="hidden sm:flex items-center gap-2" style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: perfil?.avatar_url ? 'transparent' : 'rgba(200,244,0,0.15)',
                    border: '1.5px solid rgba(200,244,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--lime)',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    overflow: 'hidden',
                  }}>
                    {perfil?.avatar_url
                      ? <img src={perfil.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initial
                    }
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{perfil?.username}</span>
                </Link>
                <NotificationButton />
                <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.35rem 0.875rem', fontSize: '0.8rem' }}>
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-secondary" style={{ padding: '0.35rem 0.875rem', fontSize: '0.8rem' }}>
                  Entrar
                </Link>
                <Link href="/auth/register" className="btn-primary" style={{ padding: '0.35rem 0.875rem', fontSize: '0.85rem' }}>
                  Registar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BOTTOM NAV (mobile only) ──────────────── */}
      <nav className="lg:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
      }}>
        {/* If no user: show login + register */}
        {!user ? (
          <>
            <Link href="/auth/login" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 0.5rem', gap: '0.2rem', color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <IconUser />
              Entrar
            </Link>
            <div style={{ width: 1, background: 'var(--border)', margin: '0.5rem 0' }} />
            <Link href="/" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 0.5rem', gap: '0.2rem', color: pathname === '/' ? 'var(--lime)' : 'var(--text-dim)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <IconHome />
              Início
            </Link>
          </>
        ) : (
          bottomLinks.map((link, i) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '0.7rem 0.5rem', gap: '0.2rem',
                  color: active ? 'var(--lime)' : 'var(--text-dim)',
                  fontSize: '0.62rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  transition: 'color 0.15s',
                  position: 'relative',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 28, height: 2, borderRadius: 1, background: 'var(--lime)',
                  }} />
                )}
                <span style={{ transition: 'transform 0.15s', transform: active ? 'scale(1.1)' : 'scale(1)' }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            )
          })
        )}
      </nav>
    </>
  )
}
