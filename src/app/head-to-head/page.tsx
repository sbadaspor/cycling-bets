import { createClient } from '@/lib/supabase/server'
import { getAllLeaderboardsFinalizadas } from '@/lib/queries'
import Link from 'next/link'

export default async function HeadToHeadPage() {
  const supabase = await createClient()

  const [perfis, todosLeaderboards, todasHistoricas] = await Promise.all([
    supabase.from('perfis').select('id, username, avatar_url, full_name').then(r => r.data ?? []),
    getAllLeaderboardsFinalizadas(),
    supabase.from('apostas_historicas').select('*').then(r => r.data ?? []),
  ])

  if (perfis.length < 2) {
    return <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Ainda não há jogadores suficientes.</div>
  }

  // Construir sumário de provas — combina app + histórico
  type ProvaSummary = {
    provaId: string
    nome: string
    ano: number
    resultados: Array<{ userId: string; rank: number; pontos: number }>
  }

  const provasSummary: ProvaSummary[] = []

  // Provas da app (finalizadas)
  for (const { prova, leaderboard } of todosLeaderboards) {
    if (leaderboard.length === 0) continue
    provasSummary.push({
      provaId: prova.id,
      nome: prova.nome,
      ano: new Date(prova.data_fim).getFullYear(),
      resultados: leaderboard.map(e => ({ userId: e.perfil.id, rank: e.rank, pontos: e.aposta.pontos_total })),
    })
  }

  // Provas históricas — agrupar por nome+ano
  const historicasMap = new Map<string, ProvaSummary>()
  for (const h of todasHistoricas as any[]) {
    const key = `${h.ano}-${h.nome_prova}`
    if (!historicasMap.has(key)) {
      historicasMap.set(key, { provaId: `hist-${key}`, nome: h.nome_prova, ano: h.ano, resultados: [] })
    }
    if (h.posicao_grupo) {
      historicasMap.get(key)!.resultados.push({
        userId: h.user_id,
        rank: h.posicao_grupo,
        pontos: h.pontos_total ?? 0,
      })
    }
  }
  provasSummary.push(...historicasMap.values())
  provasSummary.sort((a, b) => b.ano - a.ano || a.nome.localeCompare(b.nome))

  // Calcular H2H entre cada par de jogadores
  type Stats = { vitorias: number; pontos: number; provas: number }
  type H2H = Record<string, Record<string, Stats>>

  const h2h: H2H = {}
  for (const p of perfis) {
    h2h[p.id] = {}
    for (const q of perfis) {
      if (p.id !== q.id) h2h[p.id][q.id] = { vitorias: 0, pontos: 0, provas: 0 }
    }
  }

  for (const ps of provasSummary) {
    for (const a of ps.resultados) {
      for (const b of ps.resultados) {
        if (a.userId === b.userId) continue
        if (!h2h[a.userId]?.[b.userId]) continue
        h2h[a.userId][b.userId].provas++
        h2h[a.userId][b.userId].pontos += a.pontos
        if (a.rank < b.rank) h2h[a.userId][b.userId].vitorias++
      }
    }
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="animate-fade-up">
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', gap: '0.35rem', textDecoration: 'none', marginBottom: '0.75rem' }}>← Dashboard</Link>
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>⚔️ Rivalidade</p>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>
          Head‑to‑<span style={{ color: 'var(--lime)' }}>Head</span>
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
          {provasSummary.length} {provasSummary.length === 1 ? 'prova' : 'provas'} no histórico
        </p>
      </div>

      {provasSummary.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
          <p>Ainda sem provas finalizadas para comparar.</p>
        </div>
      ) : (
        perfis.flatMap((a, ai) =>
          perfis.slice(ai + 1).map(b => {
            const ab = h2h[a.id]?.[b.id]
            const ba = h2h[b.id]?.[a.id]
            if (!ab || ab.provas === 0) return null

            const vA = ab.vitorias, vB = ba?.vitorias ?? 0
            const total = vA + vB
            const pctA = total > 0 ? Math.round((vA / total) * 100) : 50
            const lider = vA > vB ? a : vB > vA ? b : null
            const inicialA = a.username?.[0]?.toUpperCase() ?? '?'
            const inicialB = b.username?.[0]?.toUpperCase() ?? '?'

            return (
              <div key={`${a.id}-${b.id}`} className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {lider ? `👑 ${lider.username} lidera` : '🤝 Empate histórico'}
                  </p>
                </div>

                <div style={{ padding: '1.25rem' }}>
                  {/* Avatares e nomes */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    {[{ perfil: a, vitorias: vA, inicial: inicialA }, { perfil: b, vitorias: vB, inicial: inicialB }].map((item, i) => (
                      <div key={item.perfil.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: item.perfil.avatar_url ? 'transparent' : 'rgba(200,244,0,0.12)', border: `2px solid ${lider?.id === item.perfil.id ? 'var(--lime)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900, color: 'var(--lime)', overflow: 'hidden', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {item.perfil.avatar_url ? <img src={item.perfil.avatar_url} alt={item.perfil.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.inicial}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: lider?.id === item.perfil.id ? 'var(--lime)' : 'var(--text)' }}>{item.perfil.username}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2rem', fontWeight: 900, color: lider?.id === item.perfil.id ? 'var(--lime)' : 'var(--text)', lineHeight: 1 }}>{item.vitorias}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>vitórias</span>
                      </div>
                    )).reduce((acc: React.ReactNode[], item, i) => [
                      ...acc,
                      item,
                      i === 0 ? <div key="vs" style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-sub)' }}>VS</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)', marginTop: '0.25rem' }}>{ab.provas} {ab.provas === 1 ? 'prova' : 'provas'}</div>
                      </div> : null,
                    ], [])}
                  </div>

                  {/* Barra de vitórias */}
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ height: '100%', width: `${pctA}%`, background: 'linear-gradient(90deg, var(--lime), rgba(200,244,0,0.5))', borderRadius: '999px' }} />
                  </div>

                  {/* Histórico de provas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {provasSummary.map(ps => {
                      const rA = ps.resultados.find(r => r.userId === a.id)
                      const rB = ps.resultados.find(r => r.userId === b.id)
                      if (!rA || !rB) return null
                      const ganhouA = rA.rank < rB.rank
                      const empate = rA.rank === rB.rank
                      return (
                        <div key={ps.provaId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', background: 'var(--surface-2)', borderRadius: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', flex: 1, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ps.nome} {ps.ano}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ganhouA ? 'var(--lime)' : 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', minWidth: '3rem', textAlign: 'center' }}>
                            {medals[rA.rank - 1] ?? `${rA.rank}º`} {rA.pontos}pt
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>vs</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: !ganhouA && !empate ? 'var(--lime)' : 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', minWidth: '3rem', textAlign: 'center' }}>
                            {medals[rB.rank - 1] ?? `${rB.rank}º`} {rB.pontos}pt
                          </span>
                        </div>
                      )
                    }).filter(Boolean)}
                  </div>
                </div>
              </div>
            )
          })
        ).filter(Boolean)
      )}
    </div>
  )
}
