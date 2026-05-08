import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAllLeaderboardsFinalizadas } from '@/lib/queries'
import { nomeExibir, inicialAvatar } from '@/lib/perfil'

interface Props {
  params: Promise<{ userId: string }>
}

export default async function EstatisticasPage({ params }: Props) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !perfil) redirect('/')

  // Buscar todas as apostas do utilizador com dados da prova e etapas
  const { data: apostasRaw } = await supabase
    .from('apostas')
    .select('*, prova:provas(*)')
    .eq('user_id', userId)
    .eq('calculada', true)

  const apostas = (apostasRaw ?? []) as Array<{
    id: string
    prova_id: string
    apostas_top20: string[]
    camisola_sprint?: string
    camisola_montanha?: string
    camisola_juventude?: string
    pontos_total: number
    pontos_top10: number
    pontos_top20: number
    pontos_camisolas: number
    acertos_exatos: number
    acertos_exatos_top10: number
    acertos_exatos_top20: number
    acertos_camisolas: number
    prova?: {
      id: string
      nome: string
      categoria: string
      status: string
      data_fim: string
    }
  }>

  // Só provas finalizadas
  const apostasFinalizadas = apostas.filter(a => a.prova?.status === 'finalizada')

  // Buscar etapas finais de cada prova para calcular acertos de ciclistas
  const provaIds = [...new Set(apostasFinalizadas.map(a => a.prova_id))]
  const etapasMap = new Map<string, string[]>() // prova_id → classificacao top20

  if (provaIds.length > 0) {
    for (const provaId of provaIds) {
      const { data: etapa } = await supabase
        .from('etapas_resultados')
        .select('classificacao_geral_top20')
        .eq('prova_id', provaId)
        .order('numero_etapa', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (etapa) {
        etapasMap.set(provaId, etapa.classificacao_geral_top20)
      }
    }
  }

  // ── Estatísticas gerais ─────────────────────────────────
  const totalProvas = apostasFinalizadas.length
  const totalPontos = apostasFinalizadas.reduce((s, a) => s + a.pontos_total, 0)
  const mediaPontos = totalProvas > 0 ? Math.round((totalPontos / totalProvas) * 10) / 10 : 0
  const totalAcertos = apostasFinalizadas.reduce((s, a) => s + a.acertos_exatos_top10 + a.acertos_exatos_top20, 0)
  const totalAcertosTop10 = apostasFinalizadas.reduce((s, a) => s + a.acertos_exatos_top10, 0)
  const totalAcertosTop20 = apostasFinalizadas.reduce((s, a) => s + a.acertos_exatos_top20, 0)
  const totalCamisolas = apostasFinalizadas.reduce((s, a) => s + a.acertos_camisolas, 0)

  // Taxa de acerto: acertos / posições apostadas
  const posicoesTop10Apostadas = apostasFinalizadas.reduce((s, a) => {
    const cat = a.prova?.categoria
    return s + (cat === 'monumento' || cat === 'prova_dia' ? 0 : 10)
  }, 0)
  const posicoesTop20Apostadas = apostasFinalizadas.reduce((s, a) => {
    const cat = a.prova?.categoria
    return s + (cat === 'monumento' || cat === 'prova_dia' ? 0 : 10)
  }, 0)

  const taxaTop10 = posicoesTop10Apostadas > 0
    ? Math.round((totalAcertosTop10 / posicoesTop10Apostadas) * 1000) / 10
    : 0
  const taxaTop20 = posicoesTop20Apostadas > 0
    ? Math.round((totalAcertosTop20 / posicoesTop20Apostadas) * 1000) / 10
    : 0

  // Melhor e pior prova
  const apostasOrdenadas = [...apostasFinalizadas].sort((a, b) => b.pontos_total - a.pontos_total)
  const melhorProva = apostasOrdenadas[0]
  const piorProva = apostasOrdenadas[apostasOrdenadas.length - 1]

  // Vitórias (posição 1 no leaderboard de cada prova)
  const todosLeaderboards = await getAllLeaderboardsFinalizadas()
  let vitorias = 0
  let podios = 0
  const resultadosComRank: Array<{ nome: string; ano: number; posicao: number; pontos: number; provaId: string }> = []

  for (const { prova, leaderboard } of todosLeaderboards) {
    const minha = leaderboard.find(e => e.perfil.id === userId)
    if (!minha) continue
    if (minha.rank === 1) vitorias++
    if (minha.rank <= 3) podios++
    resultadosComRank.push({
      nome: prova.nome,
      ano: new Date(prova.data_fim).getFullYear(),
      posicao: minha.rank,
      pontos: minha.aposta.pontos_total,
      provaId: prova.id,
    })
  }
  resultadosComRank.sort((a, b) => b.ano - a.ano)

  // ── Ciclistas mais apostados ─────────────────────────────
  const ciclistasMap = new Map<string, {
    nome: string
    vezesApostado: number
    vezesAcertou: number
    pontosGerados: number
    vezesTop10: number
    vezesTop20: number
  }>()

  for (const aposta of apostasFinalizadas) {
    const resultado = etapasMap.get(aposta.prova_id) ?? []
    const posReal = new Map<string, number>()
    resultado.forEach((c, i) => { if (c?.trim()) posReal.set(c.trim().toLowerCase(), i + 1) })
    const cat = aposta.prova?.categoria

    aposta.apostas_top20.forEach((nome, idx) => {
      if (!nome?.trim()) return
      const key = nome.trim().toLowerCase()
      if (!ciclistasMap.has(key)) {
        ciclistasMap.set(key, { nome: nome.trim(), vezesApostado: 0, vezesAcertou: 0, pontosGerados: 0, vezesTop10: 0, vezesTop20: 0 })
      }
      const entry = ciclistasMap.get(key)!
      entry.vezesApostado++

      const posApostada = idx + 1
      const isTop10Apostado = posApostada <= 10
      if (isTop10Apostado) entry.vezesTop10++
      else entry.vezesTop20++

      const pr = posReal.get(key)
      if (pr !== undefined) {
        const isSimples = cat === 'monumento' || cat === 'prova_dia'
        if (isSimples) {
          entry.vezesAcertou++
          entry.pontosGerados += pr === posApostada ? 2 : 1
        } else {
          if (isTop10Apostado && pr <= 10) {
            entry.vezesAcertou++
            entry.pontosGerados += 3
          } else if (!isTop10Apostado && pr > 10 && pr <= 20) {
            entry.vezesAcertou++
            entry.pontosGerados += 2
          } else if (!isTop10Apostado && pr <= 10) {
            entry.pontosGerados += 1
          }
        }
      }
    })
  }

  const ciclistasList = Array.from(ciclistasMap.values())
    .filter(c => c.vezesApostado >= 1)
    .sort((a, b) => b.vezesApostado - a.vezesApostado)

  const top10MaisApostados = ciclistasList.slice(0, 10)
  const topRentaveis = [...ciclistasList].sort((a, b) => b.pontosGerados - a.pontosGerados).slice(0, 5)
  const topTaxaAcerto = [...ciclistasList]
    .filter(c => c.vezesApostado >= 2)
    .map(c => ({ ...c, taxa: Math.round((c.vezesAcertou / c.vezesApostado) * 100) }))
    .sort((a, b) => b.taxa - a.taxa)
    .slice(0, 5)

  const nome = nomeExibir(perfil)
  const inicial = inicialAvatar(perfil)

  if (totalProvas === 0) {
    return (
      <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <Link href={`/perfil/${userId}`} style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
            ← Perfil
          </Link>
          <h1 className="section-title" style={{ fontSize: '1.75rem' }}>Estatísticas</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.25rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📊</div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Ainda não há provas finalizadas com apostas de {nome}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="animate-fade-up">
        <Link href={`/perfil/${userId}`} style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
          ← Perfil
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: perfil.avatar_url ? 'transparent' : 'rgba(200,244,0,0.12)', border: '2px solid rgba(200,244,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, color: 'var(--lime)', overflow: 'hidden', flexShrink: 0 }}>
            {perfil.avatar_url ? <img src={perfil.avatar_url} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.1rem' }}>📊 Estatísticas detalhadas</p>
            <h1 className="section-title" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{nome}</h1>
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
        {[
          { label: 'Provas finalizadas', value: totalProvas, suffix: '' },
          { label: 'Vitórias', value: vitorias, suffix: '' },
          { label: 'Pódios (top 3)', value: podios, suffix: '' },
          { label: 'Média de pontos', value: mediaPontos, suffix: 'pts' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{stat.label}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2rem', fontWeight: 900, color: 'var(--lime)', lineHeight: 1 }}>
              {stat.value}<span style={{ fontSize: '0.9rem', marginLeft: '2px', opacity: 0.6 }}>{stat.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Taxa de acerto por zona */}
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🎯 Precisão</p>
          <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Taxa de acerto por zona</h2>
        </div>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Top 1–10', taxa: taxaTop10, acertos: totalAcertosTop10, total: posicoesTop10Apostadas, cor: 'var(--lime)' },
            { label: 'Top 11–20', taxa: taxaTop20, acertos: totalAcertosTop20, total: posicoesTop20Apostadas, cor: 'var(--blue)' },
          ].map(zona => (
            <div key={zona.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>{zona.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{zona.acertos}/{zona.total} acertos</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.25rem', fontWeight: 900, color: zona.cor }}>{zona.taxa}%</span>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(zona.taxa, 100)}%`, background: zona.cor, borderRadius: '999px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}

          {/* Camisolas */}
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>🎽 Camisolas acertadas</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.25rem', fontWeight: 900, color: '#ff9500' }}>{totalCamisolas}</span>
          </div>
        </div>
      </div>

      {/* Melhor e pior prova */}
      <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        {melhorProva?.prova && (
          <div style={{ background: 'rgba(68,204,136,0.08)', border: '1px solid rgba(68,204,136,0.25)', borderRadius: '0.875rem', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>🏆 Melhor prova</p>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{melhorProva.prova.nome}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>{new Date(melhorProva.prova.data_fim).getFullYear()}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>{melhorProva.pontos_total}<span style={{ fontSize: '0.75rem', opacity: 0.7 }}> pts</span></p>
          </div>
        )}
        {piorProva?.prova && piorProva.prova_id !== melhorProva?.prova_id && (
          <div style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '0.875rem', padding: '1rem' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>💀 Pior prova</p>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{piorProva.prova.nome}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>{new Date(piorProva.prova.data_fim).getFullYear()}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 900, color: 'var(--red)', lineHeight: 1 }}>{piorProva.pontos_total}<span style={{ fontSize: '0.75rem', opacity: 0.7 }}> pts</span></p>
          </div>
        )}
      </div>

      {/* Ciclistas mais apostados */}
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🚴 Apostas</p>
          <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Ciclistas mais apostados</h2>
        </div>
        <div>
          {top10MaisApostados.map((c, idx) => {
            const taxa = c.vezesApostado > 0 ? Math.round((c.vezesAcertou / c.vezesApostado) * 100) : 0
            const maxApostas = top10MaisApostados[0]?.vezesApostado ?? 1
            const largura = Math.round((c.vezesApostado / maxApostas) * 100)
            return (
              <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1.25rem', borderBottom: idx < top10MaisApostados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', width: 20, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', flexShrink: 0, marginLeft: '0.5rem' }}>{c.vezesApostado}× · {taxa}% acerto</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${largura}%`, background: taxa >= 50 ? 'var(--lime)' : taxa >= 25 ? 'var(--blue)' : 'var(--text-sub)', borderRadius: '999px' }} />
                  </div>
                </div>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', fontWeight: 800, color: c.pontosGerados > 0 ? 'var(--lime)' : 'var(--text-sub)', flexShrink: 0 }}>{c.pontosGerados}pts</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ciclistas mais rentáveis */}
      {topRentaveis.length > 0 && (
        <div className="card-flush animate-fade-up">
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>💰 Rendimento</p>
            <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Ciclistas mais rentáveis</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0', borderTop: 'none' }}>
            {topRentaveis.map((c, idx) => (
              <div key={c.nome} style={{ padding: '0.875rem 1rem', borderRight: idx < topRentaveis.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: idx === 0 ? 'var(--lime)' : 'var(--text)', lineHeight: 1, marginBottom: '0.25rem' }}>{c.pontosGerados}pts</p>
                <p style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.15rem' }}>{c.nome.split(' ').slice(-1)[0]}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>{c.vezesApostado}× apostado</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Melhor taxa de acerto */}
      {topTaxaAcerto.length > 0 && (
        <div className="card-flush animate-fade-up">
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🎯 Intuição</p>
            <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Melhor taxa de acerto</h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.1rem' }}>mínimo 2 apostas</p>
          </div>
          <div>
            {topTaxaAcerto.map((c, idx) => (
              <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1.25rem', borderBottom: idx < topTaxaAcerto.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, color: idx === 0 ? 'var(--lime)' : 'var(--text-sub)', width: 24, textAlign: 'center', flexShrink: 0 }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                </span>
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)' }}>{c.nome}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{c.vezesAcertou}/{c.vezesApostado}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: c.taxa >= 75 ? 'var(--lime)' : c.taxa >= 50 ? 'var(--green)' : 'var(--text)', minWidth: 48, textAlign: 'right' }}>{c.taxa}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico completo */}
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>📋 Historial</p>
          <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Todas as provas</h2>
        </div>
        <div>
          {resultadosComRank.map((r, idx) => {
            const isWin = r.posicao === 1
            const medals = ['🥇', '🥈', '🥉']
            return (
              <Link key={r.provaId} href={`/provas/${r.provaId}/apostas/${userId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: idx < resultadosComRank.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: r.posicao <= 3 ? '1rem' : '0.82rem', fontWeight: 900, color: isWin ? 'var(--lime)' : 'var(--text-sub)', width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {medals[r.posicao - 1] ?? `${r.posicao}º`}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{r.ano}</p>
                </div>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 800, color: isWin ? 'var(--lime)' : 'var(--text)', flexShrink: 0 }}>{r.pontos}<span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginLeft: 2 }}>pts</span></span>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
