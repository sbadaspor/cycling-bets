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
    if (!username.trim() || !email || !password) {
      return setErro('Preenche todos os campos.')
    }
    if (password.length < 6) {
      return setErro('A palavra-passe deve ter pelo menos 6 caracteres.')
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return setErro('O username só pode conter letras, números e underscore.')
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
      },
    })

    if (error) {
      setErro(error.message)
    } else {
      setSucesso(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    }
    setLoading(false)
  }

  if (sucesso) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="card text-center max-w-sm w-full">
          <div className="text-4xl mb-3">✉️</div>
          <h2 className="text-xl font-bold text-zinc-100">Conta criada!</h2>
          <p className="text-zinc-400 mt-2 text-sm">
            Verifica o teu email para confirmar a conta. Depois podes entrar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🚴</span>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2">Criar Conta</h1>
          <p className="text-zinc-400 mt-1 text-sm">Junta-te ao grupo de apostas</p>
        </div>

        <div className="card space-y-4">
          {erro && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
              ⚠️ {erro}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="o_teu_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <p className="text-zinc-600 text-xs mt-1">Letras, números e underscore</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="o.teu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Palavra-passe</label>
            <input
              type="password"
              className="input-field"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? '⏳ A criar conta...' : 'Criar Conta'}
          </button>

          <p className="text-center text-zinc-500 text-sm">
            Já tens conta?{' '}
            <Link href="/auth/login" className="text-amber-400 hover:text-amber-300">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
