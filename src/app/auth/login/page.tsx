'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    if (error) {
      setErro('Credenciais inválidas. Verifica o email e a palavra-passe.')
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-up">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '1rem',
            background: 'rgba(200,244,0,0.12)', border: '1.5px solid rgba(200,244,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '2rem',
          }}>
            🚴
          </div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '0.35rem',
          }}>
            Velo<span style={{ color: 'var(--lime)' }}>Apostas</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
            Entra para gerir as tuas apostas
          </p>
        </div>

        {/* Form card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {erro && (
            <div style={{
              background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)',
              borderRadius: '0.75rem', padding: '0.75rem 1rem',
              fontSize: '0.85rem', color: 'var(--red)',
            }}>
              ⚠️ {erro}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="o.teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Palavra-passe
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.25rem', padding: '0.8rem', fontSize: '1rem' }}
          >
            {loading ? '⏳ A entrar...' : 'Entrar →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Não tens conta?{' '}
            <Link href="/auth/register" style={{ color: 'var(--lime)', fontWeight: 600, textDecoration: 'none' }}>
              Registar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
