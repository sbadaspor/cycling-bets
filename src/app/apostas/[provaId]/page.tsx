import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProva, getMinhaAposta, getCiclistas } from '@/lib/queries'
import { ApostaForm } from '@/components/forms/ApostaForm'

interface Props {
  params: Promise<{ provaId: string }>
}

export default async function ApostaPage({ params }: Props) {
  const { provaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let prova
  try { prova = await getProva(provaId) } catch { redirect('/') }
  if (prova.status !== 'aberta') redirect(`/provas/${provaId}`)

  const [minhaAposta, ciclistas] = await Promise.all([
    getMinhaAposta(provaId, user.id),
    getCiclistas(provaId),
  ])

  if (ciclistas.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
          <Link href="/apostas" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
            ← Apostas
          </Link>
          <h1 className="section-title" style={{ fontSize: '1.75rem' }}>{prova.nome}</h1>
        </div>
        <div className="card animate-fade-up delay-1" style={{ textAlign: 'center', padding: '3rem 1.25rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Startlist em breve
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', maxWidth: 340, margin: '0 auto 1.5rem' }}>
            A lista de ciclistas ainda não foi carregada. Volta quando a startlist estiver disponível.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex' }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <Link href="/apostas" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
          ← Apostas
        </Link>
        <h1 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{prova.nome}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          {minhaAposta ? 'Atualiza a tua previsão' : 'Submete a tua previsão'}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-aberta">● Aberta</span>
          {minhaAposta && <span className="badge" style={{ background: 'rgba(68,136,255,0.12)', color: 'var(--blue)', border: '1px solid rgba(68,136,255,0.25)' }}>Aposta existente</span>}
          <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--border-hi)' }}>
            {ciclistas.length} ciclistas
          </span>
        </div>
      </div>

      <ApostaForm prova={prova} apostaExistente={minhaAposta} ciclistas={ciclistas} />
    </div>
  )
}
