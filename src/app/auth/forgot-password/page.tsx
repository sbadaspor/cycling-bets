'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async () => {
    setErro(null)
    if (!email.trim()) return setErro('Introduz o teu email.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      setErro('Não foi possível enviar o email. Verifica o endereço.')
    } else {
      setEnviado(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-up">

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '1rem',
            background: 'rgba(200,244,0,0.12)', border: '1.5px solid rgba(200,244,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '2rem',
          }}>
            🔑
          </div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '0.35rem',
          }}>
            Recuperar conta
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
            Envia-mos um link para redefinires a password
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {enviado ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📬</div>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>Email enviado!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
                Verifica a tua caixa de entrada (e o spam) e clica no link.
              </p>
              <Link href="/auth/login" style={{ color: 'var(--lime)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <>
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
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
              >
                {loading ? '⏳ A enviar...' : 'Enviar link →'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                <Link href="/auth/login" style={{ color: 'var(--lime)', fontWeight: 600, textDecoration: 'none' }}>
                  ← Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
