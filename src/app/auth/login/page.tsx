'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const LogoSVG = () => (
  <svg width="44" height="28" viewBox="0 0 36 22" fill="none">
    <circle cx="7.5" cy="15" r="6" stroke="#16140F" strokeWidth="2" />
    <circle cx="28.5" cy="15" r="6" stroke="#E0451F" strokeWidth="2" />
    <path d="M7.5 15 L16 7 L25 15" stroke="#16140F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 7 L28.5 15" stroke="#E0451F" strokeWidth="2" strokeLinecap="round" />
    <path d="M14.5 7 L18.5 7" stroke="#16140F" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleLogin = async () => {
    setErro(null)
    if (!email || !password) return setErro('Preenche email e palavra-passe.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErro('Credenciais inválidas. Verifica o email e a palavra-passe.')
    else { router.push('/'); router.refresh() }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <LogoSVG />
            <span style={{ font: "800 22px 'Archivo', sans-serif", letterSpacing: '-0.01em', color: '#16140F' }}>
              VELO<span style={{ color: '#E0451F' }}>APOSTAS</span>
            </span>
          </div>
          <p style={{ font: "400 14px 'Archivo', sans-serif", color: '#857E6F' }}>
            Entra para gerir as tuas apostas
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 18, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {erro && (
            <div style={{ background: 'rgba(224,69,31,0.06)', border: '1px solid rgba(224,69,31,0.2)', borderRadius: 10, padding: '12px 16px', font: "400 13px 'Archivo', sans-serif", color: '#E0451F' }}>
              ⚠️ {erro}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A79F8E', marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              placeholder="o.teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #E2DCCF', background: '#FCFBF7', font: "400 14px 'Archivo', sans-serif", color: '#16140F', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#16140F'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#E2DCCF'; e.target.style.background = '#FCFBF7' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A79F8E' }}>
                Palavra-passe
              </label>
              <Link href="/auth/forgot-password" style={{ font: "400 12px 'Archivo', sans-serif", color: '#A79F8E', textDecoration: 'none' }}>
                Esqueci a password
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #E2DCCF', background: '#FCFBF7', font: "400 14px 'Archivo', sans-serif", color: '#16140F', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#16140F'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#E2DCCF'; e.target.style.background = '#FCFBF7' }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: loading ? '#857E6F' : '#16140F', color: '#fff',
              font: "700 15px 'Archivo', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#E0451F' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#16140F' }}
          >
            {loading ? 'A entrar...' : 'Entrar →'}
          </button>

          <p style={{ textAlign: 'center', font: "400 13px 'Archivo', sans-serif", color: '#857E6F', margin: 0 }}>
            Não tens conta?{' '}
            <Link href="/auth/register" style={{ font: "600 13px 'Archivo', sans-serif", color: '#16140F', textDecoration: 'none' }}>
              Registar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
