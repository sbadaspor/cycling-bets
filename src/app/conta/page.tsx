import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ContaForm from '@/components/conta/ContaForm'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/')

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ padding: '20px 0 24px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: "500 13px 'Archivo', sans-serif", color: '#A79F8E', textDecoration: 'none', marginBottom: 16 }}>
          ← Início
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E0451F', display: 'inline-block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Definições
          </span>
        </div>
        <h1 style={{ font: "800 36px 'Archivo', sans-serif", letterSpacing: '-0.02em', color: '#16140F', margin: 0 }}>
          O meu Perfil
        </h1>
        <p style={{ font: "400 14px 'Archivo', sans-serif", color: '#857E6F', margin: '6px 0 0' }}>
          Todos os campos são opcionais.
        </p>
      </div>
      <ContaForm perfil={perfil} />
    </div>
  )
}
