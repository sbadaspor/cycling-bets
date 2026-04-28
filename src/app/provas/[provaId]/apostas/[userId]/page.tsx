import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProva, getApostaPorUser, getApostasProvaComPerfil, getUltimaEtapa } from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import ApostaDetalhe from '@/components/dashboard/ApostaDetalhe'
import type { Aposta, EtapaResultado } from '@/types'

interface Props {
  params: Promise<{ provaId: string; userId: string }>
}

export default async function ApostaDetalhePage({ params }: Props) {
  const { provaId, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let prova
  try { prova = await getProva(provaId) } catch { redirect('/apostas') }

  const cat = categorizarProva(prova)
  if (userId !== user.id && cat.estado === 'futura') redirect('/apostas')

  let aposta: Aposta | null = null
  let todasApostas: Aposta[] = []
  let ultimaEtapa: EtapaResultado | null = null

  try {
    ;[aposta, todasApostas, ultimaEtapa] = await Promise.all([
      getApostaPorUser(provaId, userId),
      getApostasProvaComPerfil(provaId),
      getUltimaEtapa(provaId),
    ])
  } catch (err) {
    console.error('[ApostaDetalhePage] Erro ao carregar dados:', err)
    try { aposta = await getApostaPorUser(provaId, userId) } catch { /* ignorar */ }
  }

  if (!aposta) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/apostas" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>← Voltar</Link>
        <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '3rem 1.25rem', marginTop: '1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🤷</div>
          <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Sem aposta</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Este utilizador não submeteu aposta para {prova.nome}.</p>
        </div>
      </div>
    )
  }

  const ehProvaUser = userId === user.id
  const podeEditar = ehProvaUser && cat.estado === 'futura'
  const apostasOrdenadas = Array.isArray(todasApostas)
    ? [...todasApostas].sort((a, b) => b.pontos_total - a.pontos_total)
    : []
  const ranking = apostasOrdenadas.findIndex(a => a.id === aposta!.id) + 1
  const outrasApostas = cat.estado !== 'futura' ? todasApostas.filter(a => a.user_id !== userId) : []
  const medals = ['🥇', '🥈', '🥉']

  const estadoBadge = cat.estado === 'a_decorrer'
    ? { label: '● Ao vivo', cls: 'badge-aberta' }
    : cat.estado === 'futura'
    ? { label: '⏳ Futura', cls: 'badge-fechada' }
    : { label: '✓ Finalizada', cls: 'badge-finalizada' }

  return (
    <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div className="animate-fade-up">
        <Link href="/apostas" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
          ← Apostas
        </Link>
        <h1 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{prova.nome}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
          <span className={`badge ${estadoBadge.cls}`}>{estadoBadge.label}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {aposta.perfil?.username ?? 'utilizador'}
            {ranking > 0 && ultimaEtapa && ` · #${ranking} de ${todasApostas.length}`}
          </span>
        </div>
        {podeEditar && (
          <Link href={`/apostas/${provaId}`} className="btn-primary" style={{ display: 'inline-flex', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            ✏️ Editar aposta
          </Link>
        )}
      </div>

      <ApostaDetalhe aposta={aposta} ultimaEtapa={ultimaEtapa} ehProvaUser={ehProvaUser} />

      {outrasApostas.length > 0 && (
        <div className="card-flush animate-fade-up">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>👥 Comparar</p>
            <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Outras Apostas</h2>
          </div>
          <div>
            {outrasApostas.sort((a, b) => b.pontos_total - a.pontos_total).map((a, i) => {
              const rank = apostasOrdenadas.findIndex(x => x.id === a.id) + 1
              return (
                <Link key={a.id} href={`/provas/${provaId}/apostas/${a.user_id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  borderBottom: i < outrasApostas.length - 1 ? '1px solid var(--border)' : 'none',
                  textDecoration: 'none',
                }}>
                  <span style={{ fontSize: rank <= 3 ? '1rem' : '0.78rem', fontWeight: 800, color: rank <= 3 ? 'var(--lime)' : 'var(--text-dim)', fontFamily: 'Barlow Condensed, sans-serif', width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {medals[rank - 1] ?? `#${rank}`}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' }}>{a.perfil?.username}</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 800, color: rank <= 3 ? 'var(--lime)' : 'var(--text-dim)' }}>
                    {a.pontos_total} <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>pts</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
