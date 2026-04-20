'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [sessaoValida, setSessaoValida] = useState(false)

  // O Supabase redireciona para esta página com tokens na URL (#access_token=...).
  // O cliente Supabase processa automaticamente os tokens do fragmento da URL.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessaoValida(true)
      }
    })
  }, [])

  const handleSubmit = async () => {
    setErro(null)
    if (!password) return setErro('Introduz a nova password.')
    if (password.length < 6) return setErro('A password deve ter pelo menos 6 caracteres.')
    if (password !== confirmar) return setErro('As passwords não coincidem.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErro('Não foi possível atualizar a password. O link pode ter expirado.')
    } else {
      setSucesso(true)
      setTimeout(() => router.push('/'), 2500)
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
            🔒
          </div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '0.35rem',
          }}>
            Nova password
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
            Escolhe uma nova password para a tua conta
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {sucesso ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontWeight: 600, color: 'var(--lime)', marginBottom: '0.4rem' }}>Password atualizada!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>A redirecionar...</p>
            </div>
          ) : !sessaoValida ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                A verificar o link...
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Se o link expirou,{' '}
                <Link href="/auth/forgot-password" style={{ color: 'var(--lime)', textDecoration: 'none' }}>
                  pede um novo
                </Link>.
              </p>
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
                  Nova password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Confirmar password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Repete a nova password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
              >
                {loading ? '⏳ A guardar...' : 'Guardar nova password →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
