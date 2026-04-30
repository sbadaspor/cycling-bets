import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProva, getApostaPorUser, getApostasProvaComPerfil, getUltimaEtapa, getTodasEtapas } from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import ApostaDetalhe from '@/components/dashboard/ApostaDetalhe'
import SwipeableStages from '@/components/dashboard/SwipeableStages'
import ComparacaoApostas from '@/components/dashboard/ComparacaoApostas'
import type { Aposta, EtapaResultado } from '@/types'

interface Props {
  params: Promise<{ provaId: string; userId: string }>
  searchParams: Promise<{ comparar?: string }>
}

export default async function ApostaDetalhePage({ params, searchParams }: Props) {
  const { provaId, userId } = await params
  const { comparar } = await searchParams
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
  let todasEtapas: EtapaResultado[] = []

  try {
    ;[aposta, todasApostas, ultimaEtapa, todasEtapas] = await Promise.all([
      getApostaPorUser(provaId, userId),
      getApostasProvaComPerfil(provaId),
      getUltimaEtapa(provaId),
      getTodasEtapas(provaId).catch(() => []),
    ])
  } catch (err) {
    console.error('[ApostaDetalhePage] Erro ao carregar dados:', err)
    try { aposta = await getApostaPorUser(provaId, userId) } catch { /* ignorar */ }
  }

  const isMultiEtapas = todasEtapas.length > 1

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
  const outrasApostas = cat.estado !== 'futura'
    ? todasApostas.filter(a => a.user_id !== userId)
    : []

  const estadoBadge = cat.estado === 'a_decorrer'
    ? { label: '● Ao vivo', cls: 'badge-aberta' }
    : cat.estado === 'futura'
    ? { label: '⏳ Futura', cls: 'badge-fechada' }
    : { label: '✓ Finalizada', cls: 'badge-finalizada' }

  const initialModo = comparar === 'todos' ? 'comparar_todos' : 'lista'

  return (
    <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div className="animate-fade-up">
        <Link href={`/provas/${provaId}`} style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
          ← Classificação
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

      {isMultiEtapas ? (
        <SwipeableStages aposta={aposta} etapas={todasEtapas} ehProvaUser={ehProvaUser} />
      ) : (
        <ApostaDetalhe aposta={aposta} ultimaEtapa={ultimaEtapa} ehProvaUser={ehProvaUser} />
      )}

      {outrasApostas.length > 0 && (
        <ComparacaoApostas
          apostaPrincipal={aposta}
          outrasApostas={outrasApostas}
          ultimaEtapa={ultimaEtapa}
          userId={user.id}
          initialModo={initialModo}
        />
      )}
    </div>
  )
}
