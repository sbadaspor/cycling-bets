'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const handleRegister = async () => {
    setErro(null)
    if (!username.trim() || !email || !password) return setErro('Preenche todos os campos.')
    if (password.length < 6) return setErro('A palavra-passe deve ter pelo menos 6 caracteres.')
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setErro('O username só pode conter letras, números e underscore.')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username.trim() } },
    })
    if (error) { setErro(error.message) } else {
      setSucesso(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    }
    setLoading(false)
  }

  if (sucesso) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card animate-fade-up" style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✉️</div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conta criada!</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Verifica o teu email para confirmar a conta. Depois podes entrar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-up">

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '1rem',
            background: 'rgba(200,244,0,0.12)', border: '1.5px solid rgba(200,244,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '2rem',
          }}>🚴</div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '0.35rem',
          }}>
            Criar <span style={{ color: 'var(--lime)' }}>Conta</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>Junta-te ao grupo de apostas</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {erro && (
            <div style={{
              background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)',
              borderRadius: '0.75rem', padding: '0.75rem 1rem',
              fontSize: '0.85rem', color: 'var(--red)',
            }}>⚠️ {erro}</div>
          )}

          {[
            { label: 'Username', type: 'text', value: username, set: setUsername, placeholder: 'o_teu_username', hint: 'Letras, números e underscore' },
            { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'o.teu@email.com' },
            { label: 'Palavra-passe', type: 'password', value: password, set: setPassword, placeholder: 'Mínimo 6 caracteres' },
          ].map(({ label, type, value, set, placeholder, hint }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </label>
              <input
                type={type}
                className="input-field"
                placeholder={placeholder}
                value={value}
                onChange={e => set(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
              />
              {hint && <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.3rem' }}>{hint}</p>}
            </div>
          ))}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.25rem', padding: '0.8rem', fontSize: '1rem' }}
          >
            {loading ? '⏳ A criar conta...' : 'Criar Conta →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Já tens conta?{' '}
            <Link href="/auth/login" style={{ color: 'var(--lime)', fontWeight: 600, textDecoration: 'none' }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
