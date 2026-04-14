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
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🚴</span>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2">VeloApostas</h1>
          <p className="text-zinc-400 mt-1 text-sm">Entra para gerir as tuas apostas</p>
        </div>

        <div className="card space-y-4">
          {erro && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
              ⚠️ {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
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
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Palavra-passe</label>
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
            className="btn-primary w-full py-2.5"
          >
            {loading ? '⏳ A entrar...' : 'Entrar'}
          </button>

          <p className="text-center text-zinc-500 text-sm">
            Não tens conta?{' '}
            <Link href="/auth/register" className="text-amber-400 hover:text-amber-300">
              Registar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
