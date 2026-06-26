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

const LogoSVG = () => (
  <svg width="36" height="22" viewBox="0 0 36 22" fill="none">
    <circle cx="7.5" cy="15" r="6" stroke="#16140F" strokeWidth="2" />
    <circle cx="28.5" cy="15" r="6" stroke="#E0451F" strokeWidth="2" />
    <path d="M7.5 15 L16 7 L25 15" stroke="#16140F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 7 L28.5 15" stroke="#E0451F" strokeWidth="2" strokeLinecap="round" />
    <path d="M14.5 7 L18.5 7" stroke="#16140F" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

/* Icons para bottom nav mobile */
const IconHome = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M9 21V12h6v9" />
  </svg>
)
const IconBet = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M8 15h3" />
  </svg>
)
const IconAdmin = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)
const IconUser = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
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

  const navLinks = [
    { href: '/',            label: 'Início',  icon: <IconHome /> },
    ...(user ? [{ href: '/apostas',       label: 'Apostas', icon: <IconBet /> }] : []),
    { href: '/head-to-head', label: 'H2H',    icon: '⚔️' },
    { href: '/regras',      label: 'Regras',  icon: '📖' },
    ...(perfil?.is_admin ? [{ href: '/admin', label: 'Admin', icon: <IconAdmin /> }] : []),
  ]

  return (
    <>
      {/* ── TOP BAR ── */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E7E2D7',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1216, margin: '0 auto', padding: '0 32px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo + nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 38 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
              <LogoSVG />
              <span style={{ font: "800 19px 'Archivo', sans-serif", letterSpacing: '-0.01em', color: '#16140F' }}>
                VELO<span style={{ color: '#E0451F' }}>APOSTAS</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex" style={{ gap: 4 }}>
              {navLinks.map(link => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      padding: '9px 15px', borderRadius: 9,
                      background: active ? '#16140F' : 'transparent',
                      color: active ? '#fff' : '#6B665B',
                      font: `${active ? 600 : 500} 14px 'Archivo', sans-serif`,
                      textDecoration: 'none',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#EFEADF'; e.currentTarget.style.color = '#16140F' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B665B' } }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Auth section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {user ? (
              <>
                <Link href="/conta" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }} className="hidden sm:flex">
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: perfil?.avatar_url ? 'transparent' : '#16140F',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: "700 11px 'Archivo', sans-serif", color: '#fff',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {perfil?.avatar_url
                      ? <img src={perfil.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initial
                    }
                  </div>
                  <span style={{ font: "600 13px 'Archivo', sans-serif", color: '#16140F' }}>
                    {perfil?.username}
                  </span>
                </Link>
                <NotificationButton />
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 15px', borderRadius: 9,
                    border: '1px solid #E3DDD0', background: 'transparent',
                    font: "600 13px 'Archivo', sans-serif", color: '#16140F',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F1ECE1')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Sair
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/auth/login" style={{
                  padding: '8px 15px', borderRadius: 9,
                  border: '1px solid #E3DDD0',
                  font: "600 13px 'Archivo', sans-serif", color: '#16140F',
                  textDecoration: 'none',
                }}>
                  Entrar
                </Link>
                <Link href="/auth/register" style={{
                  padding: '8px 15px', borderRadius: 9,
                  background: '#16140F', color: '#fff',
                  font: "600 13px 'Archivo', sans-serif",
                  textDecoration: 'none',
                }}>
                  Registar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BOTTOM NAV (mobile only) ── */}
      <nav className="lg:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #E7E2D7',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
      }}>
        {!user ? (
          <>
            <Link href="/auth/login" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 0.5rem', gap: '0.2rem', color: '#857E6F', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textDecoration: 'none' }}>
              <IconUser />
              Entrar
            </Link>
            <div style={{ width: 1, background: '#E7E2D7', margin: '0.5rem 0' }} />
            <Link href="/" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 0.5rem', gap: '0.2rem', color: pathname === '/' ? '#16140F' : '#857E6F', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textDecoration: 'none' }}>
              <IconHome />
              Início
            </Link>
          </>
        ) : (
          navLinks.map(link => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '0.7rem 0.5rem', gap: '0.2rem',
                  color: active ? '#16140F' : '#A79F8E',
                  fontSize: '0.62rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  transition: 'color 0.15s',
                  textDecoration: 'none',
                  position: 'relative',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 28, height: 2, borderRadius: 1, background: '#E0451F',
                  }} />
                )}
                <span style={{ transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.15s' }}>
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
