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

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

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

  // Fechar menu ao navegar
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initial = perfil?.username?.[0]?.toUpperCase() ?? '?'

  const navLinks = [
    { href: '/',             label: 'Início'  },
    ...(user ? [{ href: '/apostas', label: 'Apostas' }] : []),
    { href: '/head-to-head', label: 'Histórico' },
    { href: '/regras',       label: 'Regras'  },
    ...(perfil?.is_admin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E7E2D7',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1216, margin: '0 auto',
          padding: '0 16px',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', flexShrink: 0 }}>
            <LogoSVG />
            <span style={{ font: "800 19px 'Archivo', sans-serif", letterSpacing: '-0.01em', color: '#16140F' }}>
              VELO<span style={{ color: '#E0451F' }}>APOSTAS</span>
            </span>
          </Link>

          {/* Desktop: nav links + auth */}
          <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 38 }}>
            <nav style={{ display: 'flex', gap: 4 }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {user ? (
                <>
                  <Link href="/conta" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href="/auth/login" style={{ padding: '8px 15px', borderRadius: 9, border: '1px solid #E3DDD0', font: "600 13px 'Archivo', sans-serif", color: '#16140F', textDecoration: 'none' }}>
                    Entrar
                  </Link>
                  <Link href="/auth/register" style={{ padding: '8px 15px', borderRadius: 9, background: '#16140F', color: '#fff', font: "600 13px 'Archivo', sans-serif", textDecoration: 'none' }}>
                    Registar
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 10 }}>
            {user && <NotificationButton />}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 40, height: 40, borderRadius: 9,
                border: '1px solid #E3DDD0', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
              aria-label="Menu"
            >
              {menuOpen ? (
                // X
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#16140F" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l14 14M16 2L2 16" />
                </svg>
              ) : (
                // Hamburger
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#16140F" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 4h14M2 9h14M2 14h14" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="lg:hidden" style={{
            background: '#FFFFFF', borderTop: '1px solid #E7E2D7',
            padding: '12px 16px 20px',
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {navLinks.map(link => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      padding: '12px 14px', borderRadius: 9,
                      background: active ? '#16140F' : 'transparent',
                      color: active ? '#fff' : '#16140F',
                      font: `${active ? 700 : 500} 15px 'Archivo', sans-serif`,
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Auth no mobile */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #E9E4D9' }}>
                <Link href="/conta" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: perfil?.avatar_url ? 'transparent' : '#16140F',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: "700 12px 'Archivo', sans-serif", color: '#fff', overflow: 'hidden',
                  }}>
                    {perfil?.avatar_url
                      ? <img src={perfil.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initial
                    }
                  </div>
                  <span style={{ font: "600 14px 'Archivo', sans-serif", color: '#16140F' }}>{perfil?.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 16px', borderRadius: 9,
                    border: '1px solid #E3DDD0', background: 'transparent',
                    font: "600 13px 'Archivo', sans-serif", color: '#16140F',
                    cursor: 'pointer',
                  }}
                >
                  Sair
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/auth/login" style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 9, border: '1px solid #E3DDD0', font: "600 14px 'Archivo', sans-serif", color: '#16140F', textDecoration: 'none' }}>
                  Entrar
                </Link>
                <Link href="/auth/register" style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 9, background: '#16140F', color: '#fff', font: "600 14px 'Archivo', sans-serif", textDecoration: 'none' }}>
                  Registar
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  )
}
