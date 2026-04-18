import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ContaForm from '@/components/conta/ContaForm'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/')

  return (
    <div className="max-w-lg mx-auto">
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{
          fontSize: '0.78rem', color: '#9a9ab5',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          textDecoration: 'none', marginBottom: '0.75rem',
        }}>
          ← Dashboard
        </Link>

        <p style={{
          fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem',
        }}>
          ⚙️ Definições
        </p>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: '2rem', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1,
          marginBottom: '0.4rem',
        }}>
          O meu <span style={{ color: 'var(--lime)' }}>Perfil</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#9a9ab5' }}>
          Todos os campos são opcionais.
        </p>
      </div>

      <ContaForm perfil={perfil} />
    </div>
  )
}
