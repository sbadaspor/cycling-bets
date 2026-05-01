'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkExpirado = searchParams.get('expired') === '1'

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [sessaoValida, setSessaoValida] = useState(false)

  useEffect(() => {
    if (linkExpirado) return

    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoValida(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessaoValida(true)
    })

    return () => subscription.unsubscribe()
  }, [linkExpirado])

  const handleSubmit = async () => {
    setErro(null)
    if (!password) return setErro('Introduz a nova password.')
    if (password.length < 6) return setErro('A password deve ter pelo menos 6 caracteres.')
    if (password !== confirmar) return setErro('As passwords não coincidem.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErro('Não foi possível atualizar a password. Pede um novo link.')
    } else {
      setSucesso(true)
      setTimeout(() => router.push('/'), 2500)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-up">

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '1rem',
            background: linkExpirado ? 'rgba(255,68,68,0.1)' : 'rgba(200,244,0,0.12)',
            border: `1.5px solid ${linkExpirado ? 'rgba(255,68,68,0.25)' : 'rgba(200,244,0,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '2rem',
          }}>
            {linkExpirado ? '⏰' : '🔒'}
          </div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '0.35rem' }}>
            {linkExpirado ? 'Link expirado' : 'Nova password'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
            {linkExpirado ? 'Este link de recuperação já não é válido.' : 'Escolhe uma nova password para a tua conta'}
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {sucesso ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontWeight: 600, color: 'var(--lime)', marginBottom: '0.4rem' }}>Password atualizada!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>A redirecionar...</p>
            </div>

          ) : linkExpirado ? (
            <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Os links de recuperação expiram ao fim de alguns minutos por razões de segurança.
              </p>
              <Link href="/auth/forgot-password" style={{ display: 'inline-block', background: 'rgba(200,244,0,0.9)', color: '#0a0a0f', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', marginBottom: '1rem' }}>
                Pedir novo link →
              </Link>
              <div>
                <Link href="/auth/login" style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textDecoration: 'none' }}>
                  Voltar ao login
                </Link>
              </div>
            </div>

          ) : !sessaoValida ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>A verificar o link...</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Se o link expirou,{' '}
                <Link href="/auth/forgot-password" style={{ color: 'var(--lime)', textDecoration: 'none' }}>pede um novo</Link>.
              </p>
            </div>

          ) : (
            <>
              {erro && (
                <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  ⚠️ {erro}
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nova password</label>
                <input type="password" className="input-field" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirmar password</label>
                <input type="password" className="input-field" placeholder="Repete a nova password" value={confirmar} onChange={e => setConfirmar(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>
                {loading ? '⏳ A guardar...' : 'Guardar nova password →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
